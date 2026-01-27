import express from 'express';
import { QuizResponse, ErrorResponse, ErrorType } from '../shared/types/api';
import { createServer, getServerPort, context, redis, reddit } from '@devvit/web/server';
import { createPost } from './core/post';
import { fetchQuizData } from './core/quiz';
import { getCachedQuiz, cacheQuiz, clearCachedQuiz, clearAllQuizCaches } from './core/quizCache';
import { getDailySubreddit, getDailySubredditForDate } from '../shared/config/subreddits';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Scheduled daily post creation
// This endpoint is called by Devvit's scheduler to create a new post each day
router.post('/internal/scheduled/daily-post', async (_req, res): Promise<void> => {
  try {
    const dailySubreddit = getDailySubreddit();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Check if we already created a post today (using Redis cache)
    const cacheKey = `daily_post:${today}`;
    const existingPost = await redis.get(cacheKey);
    
    if (existingPost) {
      console.log(`Daily post already created for ${today}`);
      res.json({
        status: 'success',
        message: `Daily post already exists for ${today}`,
        postId: existingPost,
      });
      return;
    }
    
    // Create the post (pass subreddit to avoid duplicate getDailySubreddit() call)
    const post = await createPost(dailySubreddit);
    
    // Cache the post ID for today (expires at midnight)
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    await redis.set(cacheKey, post.id, { expiration: midnight });
    
    console.log(`Daily post created for ${today} with subreddit r/${dailySubreddit}`);
    
    res.json({
      status: 'success',
      message: `Daily post created for ${today} with subreddit r/${dailySubreddit}`,
      postId: post.id,
      subreddit: dailySubreddit,
    });
  } catch (error) {
    console.error(`Error creating daily post: ${error}`);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create daily post',
    });
  }
});

// Clear cache endpoint (for admin/testing purposes)
router.post('/api/clear-cache', async (req, res): Promise<void> => {
  try {
    const { subreddit } = req.body as { subreddit?: string };
    
    if (subreddit) {
      await clearCachedQuiz(subreddit);
      res.json({
        status: 'success',
        message: `Cache cleared for r/${subreddit}`,
      });
    } else {
      await clearAllQuizCaches();
      res.json({
        status: 'success',
        message: 'All quiz caches cleared',
      });
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to clear cache',
    });
  }
});

// GET /api/next-subreddit?days=N - Returns tomorrow's subreddit and optional upcoming days (for planning rotation)
router.get('/api/next-subreddit', async (req, res): Promise<void> => {
  try {
    const daysParam = req.query.days as string | undefined;
    const days = daysParam ? Math.min(Math.max(1, parseInt(daysParam, 10)), 31) : 7;
    const today = new Date();
    const upcoming: { date: string; subreddit: string }[] = [];
    for (let i = 1; i <= days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      upcoming.push({
        date: d.toISOString().split('T')[0],
        subreddit: getDailySubredditForDate(d),
      });
    }
    res.json({
      today: getDailySubreddit(),
      todayDate: today.toISOString().split('T')[0],
      nextSubreddit: getDailySubredditForDate(new Date(today.getTime() + 86400000)),
      nextDate: new Date(today.getTime() + 86400000).toISOString().split('T')[0],
      upcoming,
    });
  } catch (error) {
    console.error('Error getting next subreddit:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get next subreddit',
    });
  }
});

// GET /api/daily-subreddit?postId=POST_ID - Returns the subreddit for today or for a specific post
router.get('/api/daily-subreddit', async (req, res): Promise<void> => {
  try {
    const postId = req.query.postId as string | undefined;
    
    // If postId is provided, try to get the post's original date/subreddit
    if (postId) {
      const postMetaKey = `post_meta:${postId}`;
      const postMetaData = await redis.get(postMetaKey);
      
      if (postMetaData) {
        try {
          const postMeta = JSON.parse(postMetaData) as { date: string; subreddit: string };
          res.json({
            subreddit: postMeta.subreddit,
            date: postMeta.date,
            isHistorical: true, // Indicates this is from an old post
          });
          return;
        } catch (error) {
          console.error(`Failed to parse post metadata for ${postId}:`, error);
          // Fall through to use today's subreddit
        }
      }
    }
    
    // Default: return today's subreddit
    const dailySubreddit = getDailySubreddit();
    res.json({
      subreddit: dailySubreddit,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      isHistorical: false,
    });
  } catch (error) {
    console.error('Error getting daily subreddit:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get daily subreddit',
    });
  }
});

// GET /api/quiz?subreddit=SUBREDDIT&date=YYYY-MM-DD&postId=POST_ID
// subreddit and date are optional - if postId is provided, uses post's original date/subreddit
router.get<unknown, QuizResponse | ErrorResponse, unknown>(
  '/api/quiz',
  async (req, res): Promise<void> => {
    const postId = req.query.postId as string | undefined;
    let subreddit = req.query.subreddit as string | undefined;
    let date = req.query.date as string | undefined;
    
    // If postId is provided, prioritize the post's original date/subreddit
    // This ensures historical posts maintain their original quiz even if subreddit is also passed
    if (postId) {
      const postMetaKey = `post_meta:${postId}`;
      const postMetaData = await redis.get(postMetaKey);
      
      if (postMetaData) {
        try {
          const postMeta = JSON.parse(postMetaData) as { date: string; subreddit: string };
          // Override with post's original metadata to ensure historical accuracy
          subreddit = postMeta.subreddit;
          date = postMeta.date;
          console.log(`Using historical quiz for post ${postId}: date=${date}, subreddit=${subreddit}`);
        } catch (error) {
          console.error(`Failed to parse post metadata for ${postId}:`, error);
          // If parsing fails, fall through to use provided subreddit or daily subreddit
        }
      } else {
        console.warn(`No metadata found for post ${postId}, using provided subreddit or daily subreddit`);
      }
    }
    
    // If no subreddit provided, use the daily subreddit
    if (!subreddit) {
      subreddit = getDailySubreddit();
    }
    
    // Validate subreddit name
    if (!subreddit || subreddit.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Please select a valid subreddit',
        type: 'INSUFFICIENT_DATA',
        retryable: false,
      } as ErrorResponse);
      return;
    }
    
    try {
      // Check Redis cache first (use provided date or today's date)
      const cachedQuiz = await getCachedQuiz(subreddit, date);
      
      if (cachedQuiz && cachedQuiz.length > 0) {
        console.log(`Returning cached quiz for r/${subreddit}`);
        res.json({
          quiz: cachedQuiz,
        });
        return;
      }
      
      // Cache miss - fetch from Reddit API
      console.log(`Cache miss for r/${subreddit}, fetching from Reddit API...`);
      
      try {
        const quizData = await fetchQuizData(subreddit);
        
        if (quizData.length === 0) {
          // Try to provide helpful error message
          const errorResponse: ErrorResponse = {
            status: 'error',
            message: `Couldn't find enough quiz questions for r/${subreddit}. This subreddit may not exist, may be private, or may not have enough posts with comments.`,
            type: 'INSUFFICIENT_DATA',
            retryable: true,
            suggestion: 'Try selecting a different subreddit',
          };
          res.status(404).json(errorResponse);
          return;
        }
        
        // Cache the quiz data (use provided date or today's date, expires in 30 days)
        await cacheQuiz(subreddit, quizData, date);
        
        res.json({
          quiz: quizData,
        });
      } catch (fetchError) {
        // Categorize the error
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        let errorType: ErrorType = 'UNKNOWN_ERROR';
        let retryable = false;
        let suggestion = 'Please try again later';
        
        // Categorize errors
        if (errorMessage.includes('not found') || errorMessage.includes('does not exist') || errorMessage.includes('404')) {
          errorType = 'SUBREDDIT_NOT_FOUND';
          suggestion = 'Please check the subreddit name and try a different one';
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          errorType = 'RATE_LIMIT';
          retryable = true;
          suggestion = 'Reddit is rate limiting requests. Please wait a moment and try again';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
          errorType = 'NETWORK_ERROR';
          retryable = true;
          suggestion = 'Network error occurred. Please check your connection and try again';
        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
          errorType = 'API_ERROR';
          suggestion = 'Unable to access Reddit data. The subreddit may be private or restricted';
        }
        
        const errorResponse: ErrorResponse = {
          status: 'error',
          message: errorMessage,
          type: errorType,
          retryable,
          suggestion,
        };
        
        res.status(errorType === 'SUBREDDIT_NOT_FOUND' ? 404 : errorType === 'RATE_LIMIT' ? 429 : 500).json(errorResponse);
        return;
      }
    } catch (error) {
      console.error(`Unexpected error fetching quiz for r/${subreddit}:`, error);
      const errorResponse: ErrorResponse = {
        status: 'error',
        message: 'Failed to load quiz. Please try again.',
        type: 'UNKNOWN_ERROR',
        retryable: true,
        suggestion: 'Please try again in a moment',
      };
      res.status(500).json(errorResponse);
    }
  }
);

// POST /api/share-score - Share user's score as a comment on the post
router.post('/api/share-score', async (req, res): Promise<void> => {
  try {
    const { postId, score, totalQuestions, subreddit, strategy } = req.body as {
      postId?: string;
      score: number;
      totalQuestions: number;
      subreddit: string;
      strategy?: string;
    };

    // Validate required fields and types
    if (!postId || typeof postId !== 'string' || !postId.trim()) {
      res.status(400).json({ status: 'error', message: 'Post ID is required' });
      return;
    }
    if (typeof score !== 'number' || isNaN(score) || typeof totalQuestions !== 'number' || isNaN(totalQuestions)) {
      res.status(400).json({ status: 'error', message: 'Score and total questions must be valid numbers' });
      return;
    }
    if (typeof subreddit !== 'string' || !subreddit.trim()) {
      res.status(400).json({ status: 'error', message: 'Subreddit must be a valid string' });
      return;
    }
    if (!strategy || typeof strategy !== 'string' || !strategy.trim()) {
      res.status(400).json({ status: 'error', message: 'Strategy text is required' });
      return;
    }

    const percentage = Math.round((score / totalQuestions) * 100);
    const scoreText = `I scored ${score}/${totalQuestions} (${percentage}%) on today's How Hivemind r/ You? challenge for r/${subreddit}!`;
    const commentText = `${scoreText}\n\n**What was your strategy?**\n\n${strategy.trim()}`;
    const parentId = postId.startsWith('t3_') ? postId : `t3_${postId}`;

    await reddit.submitComment({ id: parentId, text: commentText, runAs: 'USER' });
    res.json({ status: 'success', message: 'Score shared successfully' });
  } catch (error) {
    console.error('Error in share-score endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      status: 'error',
      message: `Failed to share score: ${errorMessage}`,
    });
  }
});

// POST /api/subscribe - Subscribe user to the current subreddit
router.post('/api/subscribe', async (req, res): Promise<void> => {
  try {
    // According to Devvit docs, subscribeToCurrentSubreddit() subscribes as the user by default
    // https://developers.reddit.com/docs/capabilities/server/userActions
    try {
      await reddit.subscribeToCurrentSubreddit();

      res.json({
        status: 'success',
        message: 'Subscribed to the subreddit',
      });
    } catch (error) {
      console.error('Error subscribing to subreddit:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        status: 'error',
        message: `Failed to subscribe: ${errorMessage}`,
      });
    }
  } catch (error) {
    console.error('Error in subscribe endpoint:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process subscribe request',
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
