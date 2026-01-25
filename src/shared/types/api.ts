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
