import { redis } from '@devvit/web/server';
import type { QuizQuestion } from '../../shared/types/api';

/**
 * Generate a cache key for a subreddit quiz on a specific date
 * Format: quiz:{subreddit}:{YYYY-MM-DD}
 */
export function getDailyCacheKey(subreddit: string, date?: string): string {
  const dateStr = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `quiz:${subreddit}:${dateStr}`;
}

/**
 * Get cached quiz data from Redis
 * @param subreddit - The subreddit name
 * @param date - Optional date string (YYYY-MM-DD). If not provided, uses today's date.
 */
export async function getCachedQuiz(
  subreddit: string,
  date?: string
): Promise<QuizQuestion[] | null> {
  const cacheKey = getDailyCacheKey(subreddit, date);
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
 * Cache quiz data in Redis with extended expiration (30 days)
 * This allows old posts to maintain their original quiz questions
 * @param subreddit - The subreddit name
 * @param quizData - The quiz data to cache
 * @param date - Optional date string (YYYY-MM-DD). If not provided, uses today's date.
 */
export async function cacheQuiz(
  subreddit: string,
  quizData: QuizQuestion[],
  date?: string
): Promise<void> {
  const cacheKey = getDailyCacheKey(subreddit, date);
  // Set expiration to 30 days from now (allows users to replay old posts)
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 30);

  try {
    await redis.set(cacheKey, JSON.stringify(quizData), { expiration });
    const ttl = Math.floor((expiration.getTime() - Date.now()) / 1000);
    console.log(
      `Cached quiz for r/${subreddit} (date: ${date || 'today'}) with TTL ${ttl} seconds (30 days)`
    );
  } catch (error) {
    console.error(`Failed to cache quiz data for ${subreddit}:`, error);
    // Don't throw - caching failure shouldn't break the request
  }
}

/**
 * Clear cached quiz data for a specific subreddit and date
 * @param subreddit - The subreddit name
 * @param date - Optional date string (YYYY-MM-DD). If not provided, clears today's cache.
 */
export async function clearCachedQuiz(subreddit: string, date?: string): Promise<void> {
  const cacheKey = getDailyCacheKey(subreddit, date);
  try {
    await redis.del(cacheKey);
    console.log(`Cleared cache for r/${subreddit}${date ? ` (date: ${date})` : ' (today)'}`);
  } catch (error) {
    console.error(`Failed to clear cache for ${subreddit}:`, error);
    throw error;
  }
}

const SKIP_SUBREDDITS_KEY = 'skip_subreddits';

/**
 * Subreddits that failed to load (banned, private, etc.) so we try the next in rotation
 */
export async function isSubredditSkipped(subreddit: string): Promise<boolean> {
  const raw = await redis.get(SKIP_SUBREDDITS_KEY);
  if (!raw) return false;
  try {
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) && list.includes(subreddit);
  } catch {
    return false;
  }
}

export async function addSubredditToSkipList(subreddit: string): Promise<void> {
  const raw = await redis.get(SKIP_SUBREDDITS_KEY);
  const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
  if (!Array.isArray(list)) return;
  const normalized = subreddit.trim();
  if (!normalized || list.includes(normalized)) return;
  list.push(normalized);
  await redis.set(SKIP_SUBREDDITS_KEY, JSON.stringify(list));
  console.log(`Added r/${normalized} to skip list (banned/unavailable)`);
}

const REPLACED_POSTS_KEY = 'replaced_posts';
const REPORT_THRESHOLD = 3;

function reportKey(postId: string): string {
  return `report:${postId}`;
}

/**
 * Post IDs that have been replaced (enough user reports as inappropriate)
 */
export async function getReplacedPostIds(): Promise<string[]> {
  const raw = await redis.get(REPLACED_POSTS_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function addPostToReplaced(postId: string): Promise<void> {
  const normalized = postId.trim();
  if (!normalized) return;
  const ids = await getReplacedPostIds();
  if (ids.includes(normalized)) return;
  ids.push(normalized);
  await redis.set(REPLACED_POSTS_KEY, JSON.stringify(ids));
  console.log(`Added post ${normalized} to replaced list (inappropriate reports)`);
}

/**
 * Add a report for a post. If reporterId is provided, each user is counted once per post;
 * otherwise each request counts (anonymous). Storage is always a list of reporter IDs.
 * When report count reaches threshold, adds post to replaced list.
 * Returns the current report count for this post.
 */
export async function incrementReportCount(
  postId: string,
  reporterId?: string | null
): Promise<number> {
  const normalized = postId.trim();
  if (!normalized) return 0;
  const key = reportKey(normalized);
  const raw = await redis.get(key);
  let list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
  if (!Array.isArray(list)) list = [];

  const id =
    reporterId != null && String(reporterId).trim() !== ''
      ? String(reporterId).trim()
      : `__anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  if (id.startsWith('__anon_')) {
    list.push(id);
  } else {
    if (list.includes(id)) return list.length;
    list.push(id);
  }
  await redis.set(key, JSON.stringify(list));
  if (list.length >= REPORT_THRESHOLD) {
    await addPostToReplaced(normalized);
  }
  return list.length;
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
