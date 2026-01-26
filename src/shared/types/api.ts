// Quiz types
export type QuizComment = {
  id: string;
  body: string;
  ups: number;
  author: string | null;
  gifUrl?: string | null;
};

export type QuizQuestion = {
  postId: string;
  title: string;
  selftext?: string;
  url?: string;
  imageUrl?: string;
  imageUrls?: string[];
  isVideo?: boolean;
  videoUrl?: string;
  author: string | null;
  permalink: string;
  comments: QuizComment[];
};

export type QuizResponse = {
  quiz: QuizQuestion[];
  isNsfw?: boolean;
};

export type FetchQuizRequest = {
  subreddit: string;
};

export type DailySubredditResponse = {
  subreddit: string;
  date: string; // YYYY-MM-DD
  isHistorical?: boolean; // True if this is from an old post
};

// Error types for better error handling
export type ErrorType = 
  | 'NETWORK_ERROR'
  | 'SUBREDDIT_NOT_FOUND'
  | 'INSUFFICIENT_DATA'
  | 'API_ERROR'
  | 'RATE_LIMIT'
  | 'UNKNOWN_ERROR';

export type ErrorResponse = {
  status: 'error';
  message: string;
  type?: ErrorType;
  retryable?: boolean;
  suggestion?: string;
};
