/**
 * Approved subreddits for daily quiz rotation
 * These subreddits are curated to ensure quality content and appropriate topics
 */
export const APPROVED_SUBREDDITS = [
  'AskReddit',
  'pics',
  'todayilearned',
  'explainlikeimfive',
  'Showerthoughts',
  'LifeProTips',
  'mildlyinteresting',
  'gifs',
  'funny',
  'wholesomememes',
  'YouShouldKnow',
  'tifu',
  'AmItheAsshole',
  'unpopularopinion',
  'changemyview',
] as const;

export type ApprovedSubreddit = typeof APPROVED_SUBREDDITS[number];

/**
 * Get the daily subreddit based on the day of the year
 * Uses a deterministic rotation that cycles through approved subreddits
 * The same day will always return the same subreddit
 */
export function getDailySubreddit(): ApprovedSubreddit {
  // Get day of year (1-365/366)
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  // Use modulo to cycle through subreddits
  const index = dayOfYear % APPROVED_SUBREDDITS.length;
  return APPROVED_SUBREDDITS[index]!;
}

/**
 * Get the daily subreddit for a specific date (useful for testing/caching)
 */
export function getDailySubredditForDate(date: Date): ApprovedSubreddit {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  const index = dayOfYear % APPROVED_SUBREDDITS.length;
  return APPROVED_SUBREDDITS[index]!;
}
