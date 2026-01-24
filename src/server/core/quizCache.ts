import { redis } from '@devvit/web/server';
import type { QuizQuestion } from '../../shared/types/api';

/**
 * Generate a daily cache key for a subreddit quiz
 * Format: quiz:{subreddit}:{YYYY-MM-DD}
 */
export function getDailyCacheKey(subreddit: string): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `quiz:${subreddit}:${today}`;
}

/**
 * Calculate Date object for midnight (when cache should expire)
 */
function getMidnightDate(): Date {
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return midnight;
}

/**
 * Get cached quiz data from Redis
 */
export async function getCachedQuiz(subreddit: string): Promise<QuizQuestion[] | null> {
  const cacheKey = getDailyCacheKey(subreddit);
  const cachedData = await redis.get(cacheKey);
  
  if (!cachedData) {
    return null;
  }
  
  try {
    return JSON.parse(cachedData) as QuizQuestion[];
  } catch (error) {
    console.error(`Failed to parse cached quiz data for ${subreddit}:`, error);
    return null;
  }
}

/**
 * Cache quiz data in Redis with daily expiration
 */
export async function cacheQuiz(subreddit: string, quizData: QuizQuestion[]): Promise<void> {
  const cacheKey = getDailyCacheKey(subreddit);
  const expiration = getMidnightDate();
  
  try {
    await redis.set(cacheKey, JSON.stringify(quizData), { expiration });
    const ttl = Math.floor((expiration.getTime() - Date.now()) / 1000);
    console.log(`Cached quiz for r/${subreddit} with TTL ${ttl} seconds`);
  } catch (error) {
    console.error(`Failed to cache quiz data for ${subreddit}:`, error);
    // Don't throw - caching failure shouldn't break the request
  }
}

/**
 * Clear cached quiz data for a specific subreddit
 */
export async function clearCachedQuiz(subreddit: string): Promise<void> {
  const cacheKey = getDailyCacheKey(subreddit);
  try {
    await redis.del(cacheKey);
    console.log(`Cleared cache for r/${subreddit}`);
  } catch (error) {
    console.error(`Failed to clear cache for ${subreddit}:`, error);
    throw error;
  }
}

/**
 * Clear all quiz caches (for all subreddits)
 * Note: Redis might not have a keys() method, so we'll clear specific subreddits
 * For now, this clears common subreddits. In production, track keys separately.
 */
export async function clearAllQuizCaches(): Promise<void> {
  try {
    // Clear common subreddits
    const commonSubreddits = [
      'AskReddit',
      'pics',
      'todayilearned',
      'explainlikeimfive',
      'webdev',
      'Showerthoughts',
      'LifeProTips',
      'mildlyinteresting',
      'gifs',
    ];
    
    const keys = commonSubreddits.map((sub) => getDailyCacheKey(sub));
    if (keys.length > 0) {
      // Delete each key individually
      await Promise.all(keys.map((key) => redis.del(key)));
      console.log(`Cleared ${keys.length} quiz cache entries`);
    }
  } catch (error) {
    console.error('Failed to clear all quiz caches:', error);
    throw error;
  }
}
