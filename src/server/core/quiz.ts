import type { QuizQuestion } from '../../shared/types/api';
import { reddit } from '@devvit/web/server';

/**
 * Fetch hot posts from a subreddit using Devvit's built-in Reddit API
 */
async function fetchSubredditPostsWithDevvitAPI(
  subreddit: string,
  limit: number
): Promise<RedditPost['data'][]> {
  try {
    // Use Devvit's getHotPosts method - returns Listing<Post>
    const listing = await reddit.getHotPosts({
      subredditName: subreddit,
      limit: limit,
    });
    
    // Extract posts from Listing - Listing has an all() method that returns Promise<Post[]>
    const posts = await listing.all();
    
    // Transform Devvit post objects to our RedditPost format
    return posts.map((post: any) => {
      // Devvit post objects might have a different structure
      // Check if it's already in the format we need
      if (post.data) {
        return post.data;
      }
      
      // Otherwise, transform it - Devvit's post structure
      // Extract ID - might be in format t3_xxxxx, we need just the xxxxx part
      let postId = post.id || post.postId || '';
      if (postId.startsWith('t3_')) {
        postId = postId.substring(3);
      }
      
      return {
        id: postId,
        title: post.title || '',
        selftext: post.selftext || post.body || '',
        url: post.url || '',
        author: post.author || post.authorName || null,
        permalink: post.permalink || `/r/${subreddit}/comments/${postId}`,
        score: post.score || post.ups || 0,
        num_comments: post.numComments || post.commentCount || 0,
        over_18: post.over18 || post.nsfw || false,
        is_video: post.isVideo || false,
        media: post.media,
        preview: post.preview,
        gallery_data: post.galleryData,
      } as RedditPost['data'];
    });
  } catch (error) {
    console.error(`Error fetching posts with Devvit API for r/${subreddit}:`, error);
    throw error;
  }
}

/**
 * Fetch comments for a post using Devvit's built-in Reddit API
 */
async function fetchPostCommentsWithDevvitAPI(
  postId: string,
  limit: number
): Promise<RedditComment['data'][]> {
  try {
    // Use Devvit's getComments method - returns Listing<Comment>
    // postId needs to be in format t3_xxxxx
    const fullPostId = postId.startsWith('t3_') ? postId : `t3_${postId}`;
    
    const listing = await reddit.getComments({
      postId: fullPostId as `t3_${string}`,
      limit: limit,
    });
    
    // Extract comments from Listing - Listing has an all() method that returns Promise<Comment[]>
    const comments = await listing.all();
    
    // Transform Devvit comment objects to our RedditComment format
    const transformedComments: RedditComment['data'][] = [];
    
    function extractComments(commentsArray: any[]): void {
      for (const comment of commentsArray) {
        // Skip deleted/removed comments
        if (
          comment.body &&
          comment.body !== '[deleted]' &&
          comment.body !== '[removed]' &&
          comment.body !== ''
        ) {
          const transformed: RedditComment['data'] = {
            id: comment.id || '',
            body: comment.body || '',
            ups: comment.ups || comment.score || 0,
            author: comment.author || comment.authorName || null,
            score: comment.score || comment.ups || 0,
          };
          
          // Add replies if they exist
          if (comment.replies && Array.isArray(comment.replies) && comment.replies.length > 0) {
            transformed.replies = { data: { children: comment.replies } };
          }
          
          transformedComments.push(transformed);
          
          // Recursively extract replies if they exist
          if (comment.replies && Array.isArray(comment.replies)) {
            extractComments(comment.replies);
          }
        }
        
        // Stop if we have enough comments
        if (transformedComments.length >= limit) {
          break;
        }
      }
    }
    
    extractComments(comments);
    
    // Sort by score (ups) descending and take top N
    return transformedComments
      .sort((a, b) => b.ups - a.ups)
      .slice(0, limit);
  } catch (error) {
    console.error(`Error fetching comments with Devvit API for post ${postId}:`, error);
    console.error('Error details:', error instanceof Error ? error.stack : error);
    throw error;
  }
}

/**
 * Reddit JSON API response types
 */
type RedditPost = {
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    author: string | null;
    permalink: string;
    score: number;
    num_comments: number;
    over_18: boolean;
    is_video: boolean;
    media?: {
      reddit_video?: {
        fallback_url?: string;
      };
    };
    preview?: {
      images?: Array<{
        source?: {
          url?: string;
        };
      }>;
    };
    gallery_data?: {
      items?: Array<{
        media_id?: string;
      }>;
    };
  };
};

type RedditComment = {
  data: {
    id: string;
    body: string;
    ups: number;
    author: string | null;
    score: number;
    replies?: RedditCommentListing;
  };
};

type RedditCommentListing = {
  data: {
    children: RedditComment[];
  };
};

/**
 * Fetch hot posts from a subreddit using Devvit's built-in Reddit API
 */
export async function fetchSubredditPosts(
  subreddit: string,
  limit: number = 10
): Promise<RedditPost['data'][]> {
  // Use Devvit's built-in Reddit API
  const posts = await fetchSubredditPostsWithDevvitAPI(subreddit, limit);
  
  // Filter out deleted/removed posts
  return posts.filter((post) => {
    return post.title && post.title !== '[deleted]' && post.title !== '[removed]';
  });
}

/**
 * Fetch top comments for a post using Devvit's built-in Reddit API
 */
export async function fetchPostComments(
  _subreddit: string,
  postId: string,
  limit: number = 10
): Promise<RedditComment['data'][]> {
  // Use Devvit's built-in Reddit API (subreddit parameter not needed for getComments)
  return await fetchPostCommentsWithDevvitAPI(postId, limit);
}

/**
 * Extract image URLs from a Reddit post
 */
function extractImageUrls(post: RedditPost['data']): string[] {
  const imageUrls: string[] = [];
  
  // Check for preview images
  if (post.preview?.images) {
    for (const image of post.preview.images) {
      if (image.source?.url) {
        // Reddit image URLs are HTML encoded, decode them
        const decodedUrl = image.source.url
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        imageUrls.push(decodedUrl);
      }
    }
  }
  
  // If it's a direct image link, add it
  if (post.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(post.url)) {
    imageUrls.push(post.url);
  }
  
  return imageUrls;
}

/**
 * Extract video URL from a Reddit post
 */
function extractVideoUrl(post: RedditPost['data']): string | null {
  if (post.is_video && post.media?.reddit_video?.fallback_url) {
    return post.media.reddit_video.fallback_url;
  }
  return null;
}

/**
 * Transform Reddit post and comments into quiz question format
 */
export function transformToQuizFormat(
  posts: RedditPost['data'][],
  commentsMap: Map<string, RedditComment['data'][]>
): QuizQuestion[] {
  const quizQuestions: QuizQuestion[] = [];
  
  for (const post of posts) {
    const comments = commentsMap.get(post.id) || [];
    
    // Skip posts without enough comments
    if (comments.length < 3) {
      continue;
    }
    
    const imageUrls = extractImageUrls(post);
    const videoUrl = extractVideoUrl(post);
    
    const quizQuestion: QuizQuestion = {
      postId: post.id,
      title: post.title,
      ...(post.selftext && { selftext: post.selftext }),
      ...(post.url && { url: post.url }),
      ...(imageUrls[0] && { imageUrl: imageUrls[0] }),
      ...(imageUrls.length > 0 && { imageUrls }),
      isVideo: post.is_video || false,
      ...(videoUrl && { videoUrl }),
      author: post.author,
      permalink: `https://www.reddit.com${post.permalink}`,
      comments: comments.slice(0, 3).map((comment) => ({
        id: comment.id,
        body: comment.body,
        ups: comment.ups,
        author: comment.author,
      })),
    };
    
    quizQuestions.push(quizQuestion);
    
    // Limit to 5 questions
    if (quizQuestions.length >= 5) {
      break;
    }
  }
  
  return quizQuestions;
}

/**
 * Fetch quiz data for a subreddit
 * This is the main function that orchestrates fetching posts, comments, and transforming to quiz format
 */
export async function fetchQuizData(subreddit: string): Promise<QuizQuestion[]> {
  // Fetch hot posts (fetch more than needed in case some don't have enough comments)
  const posts = await fetchSubredditPosts(subreddit, 10);
  
  // Fetch comments for each post in parallel
  // Note: getComments needs the full post ID in t3_xxxxx format
  // We only need 3 comments per post, so fetch 5 to have some buffer
  const commentPromises = posts.map((post) => {
    // Get the original post ID (might be stored in originalId or we need to reconstruct it)
    const postId = (post as any).originalId || post.id;
    // Ensure it's in t3_ format for getComments
    const fullPostId = postId.startsWith('t3_') ? postId : `t3_${postId}`;
    
    return fetchPostComments(subreddit, fullPostId, 5).catch((error) => {
      console.error(`Failed to fetch comments for post ${post.id}:`, error);
      return []; // Return empty array on error
    });
  });
  
  const commentsArrays = await Promise.all(commentPromises);
  
  // Create a map of postId -> comments
  // Use the normalized post.id (without t3_ prefix) as the key
  const commentsMap = new Map<string, RedditComment['data'][]>();
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const comments = commentsArrays[i];
    if (post && comments && comments.length > 0) {
      commentsMap.set(post.id, comments);
    }
  }
  
  // Transform to quiz format
  const quizQuestions = transformToQuizFormat(posts, commentsMap);
  
  return quizQuestions;
}
