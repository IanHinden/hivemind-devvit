import express from 'express';
import { QuizResponse } from '../shared/types/api';
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
router.get<unknown, QuizResponse | { status: string; message: string }, unknown>(
  '/api/quiz',
  async (req, res): Promise<void> => {
    const subreddit = (req.query.subreddit as string) || 'AskReddit';
    
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
          throw new Error(`No quiz data available for r/${subreddit}. The subreddit may not exist or may not have enough posts with comments.`);
        }
        
        // Cache the quiz data for today
        await cacheQuiz(subreddit, quizData);
        
        res.json({
          quiz: quizData,
        });
      } catch (fetchError) {
        throw fetchError;
      }
    } catch (error) {
      console.error(`Error fetching quiz for r/${subreddit}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch quiz data';
      res.status(500).json({
        status: 'error',
        message: errorMessage,
      });
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
