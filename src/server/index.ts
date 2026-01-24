import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse, QuizResponse } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
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

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

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

// Debug endpoint to check available reddit methods
router.get('/api/debug/reddit-methods', async (_req, res): Promise<void> => {
  try {
    // Try to inspect what's available on reddit object
    const prototype = Object.getPrototypeOf(reddit);
    const prototypeMethods = Object.getOwnPropertyNames(prototype).filter(
      (name) => typeof (reddit as any)[name] === 'function' && name !== 'constructor'
    );
    const staticMethods = Object.keys(reddit).filter(
      (name) => typeof (reddit as any)[name] === 'function'
    );
    const allProperties = Object.getOwnPropertyNames(reddit);
    
    // Try calling getCurrentUsername to verify it works
    const currentUsername = await reddit.getCurrentUsername();
    
    // Try to see if there are any methods that might fetch posts
    const possibleMethods = [
      'getPosts',
      'getSubredditPosts',
      'fetch',
      'get',
      'request',
      'api',
      'getPost',
      'getComments',
    ];
    
    const availableMethods: Record<string, boolean> = {};
    for (const method of possibleMethods) {
      availableMethods[method] = typeof (reddit as any)[method] === 'function';
    }
    
    res.json({
      prototypeMethods,
      staticMethods,
      allProperties,
      redditObjectType: typeof reddit,
      currentUsername,
      availableMethods,
      redditObjectKeys: Object.keys(reddit),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});

// Clear cache endpoint for testing
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

// Clear cache endpoint for testing
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
        // If fetch fails with 403/UNKNOWN, provide helpful error message
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        
        if (errorMessage.includes('403') || errorMessage.includes('Forbidden') || errorMessage.includes('UNKNOWN')) {
          console.error(`Reddit API fetch blocked for r/${subreddit}:`, errorMessage);
          res.status(503).json({
            status: 'error',
            message: 'Unable to fetch quiz data from Reddit. External fetch() calls to Reddit appear to be blocked by Devvit. Please check /api/debug/reddit-methods to see available Reddit API methods.',
            error: errorMessage,
          } as { status: string; message: string; error: string });
          return;
        }
        
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
