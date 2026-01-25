import express from 'express';
import { QuizResponse, ErrorResponse, ErrorType } from '../shared/types/api';
import { createServer, getServerPort, context } from '@devvit/web/server';
import { createPost } from './core/post';
import { fetchQuizData } from './core/quiz';
import { getCachedQuiz, cacheQuiz, clearCachedQuiz, clearAllQuizCaches } from './core/quizCache';

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

// GET /api/quiz?subreddit=SUBREDDIT
router.get<unknown, QuizResponse | ErrorResponse, unknown>(
  '/api/quiz',
  async (req, res): Promise<void> => {
    const subreddit = (req.query.subreddit as string) || 'AskReddit';
    
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
      // Check Redis cache first
      const cachedQuiz = await getCachedQuiz(subreddit);
      
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
        
        // Cache the quiz data for today
        await cacheQuiz(subreddit, quizData);
        
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

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
