/**
 * Approved subreddits for daily quiz rotation
 * These subreddits are curated to ensure quality content and appropriate topics
 */
export const APPROVED_SUBREDDITS = [
  'BrandNewSentence',
  'technicallythetruth',
  'ihadastroke',
  'rareinsults',
  'PointlessStories',
  'FirstWorldProblems',
  'Unexpected',
  'CrappyDesign',
  'therewasanattempt',
] as const;

export type ApprovedSubreddit = (typeof APPROVED_SUBREDDITS)[number];

/**
 * Get the daily subreddit based on the day of the year
 * Uses a deterministic rotation that cycles through approved subreddits
 * The same day will always return the same subreddit
 *
 * Pass override to force a specific subreddit (e.g. for testing).
 */
export function getDailySubreddit(override?: string): ApprovedSubreddit {
  if (override && APPROVED_SUBREDDITS.includes(override as ApprovedSubreddit)) {
    return override as ApprovedSubreddit;
  }

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

/**
 * Subreddits in rotation order starting from today (for trying next on failure)
 */
export function getSubredditsInRotationOrder(): ApprovedSubreddit[] {
  const dayOfYear =
    Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    ) % APPROVED_SUBREDDITS.length;
  const startIndex = dayOfYear % APPROVED_SUBREDDITS.length;
  const result: ApprovedSubreddit[] = [];
  for (let i = 0; i < APPROVED_SUBREDDITS.length; i++) {
    const index = (startIndex + i) % APPROVED_SUBREDDITS.length;
    result.push(APPROVED_SUBREDDITS[index]!);
  }
  return result;
}
