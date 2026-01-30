/**
 * Approved subreddits for daily quiz rotation
 * These subreddits are curated to ensure quality content and appropriate topics
 */
export const APPROVED_SUBREDDITS = [
  'UnexpectedlySatisfying',
  'AnimalsBeingJerks',
  'tea',
  'HappyAnimals',
  'BrandNewSentence',
  'AccidentalWesAnderson',
  'PerfectTiming',
  'AnimalsBeingConfused',
  'rareinsults',
  'DIY',
  'WholesomeComics',
  'food',
  'Unexpected',
  'HappyCowGifs',
  'mildlyinteresting',
  'ArtisanVideos',
  'AnimalsBeingDerps',
  'AskReddit',
  'AccidentalRenaissance',
  'nextfuckinglevel',
  'coffee',
  'PointlessStories',
  'WholesomeMemes',
  'FirstWorldProblems',
  'cooking',
  'engrish',
  'HumansBeingCute',
  'BuyItForLife',
  'KindVoice',
  'AnimalsBeingBros',
  'NoStupidQuestions',
  'UnexpectedlyWholesome',
  'CrappyDesign',
  'boardgames',
  'Showerthoughts',
  'HappyCrowds',
  'funny',
  'pareidolia',
  'lego',
  'Wellthatsucks',
  'interestingasfuck',
  'UpliftingNews',
  'memes',
  'MadeMeSmile',
  'AnimalsBeingConfused',
  'UnexpectedCat',
  'pics',
  'oddlysatisfying',
  'HumansBeingBros',
  'UnexpectedGoose',
] as const;

export type ApprovedSubreddit = (typeof APPROVED_SUBREDDITS)[number];

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
