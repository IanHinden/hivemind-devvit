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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Devvit API returns untyped Post objects
    return posts.map((post: any) => {
      const src = post.data ?? post;
      let postId = (src.id || src.postId || '').toString();
      if (postId.startsWith('t3_')) {
        postId = postId.substring(3);
      }
      return {
        id: postId,
        title: src.title || '',
        selftext: src.selftext ?? src.body ?? '',
        url: src.url ?? src.linkUrl ?? src.destination ?? '',
        author: src.author ?? src.authorName ?? null,
        permalink: src.permalink || `/r/${subreddit}/comments/${postId}`,
        score: src.score ?? src.ups ?? 0,
        num_comments: src.numComments ?? src.commentCount ?? 0,
        over_18: src.over_18 ?? src.over18 ?? src.nsfw ?? false,
        is_video: src.is_video ?? src.isVideo ?? false,
        stickied: src.stickied ?? false,
        distinguished: src.distinguished ?? null,
        locked: src.locked ?? false,
        crosspost_parent: src.crosspost_parent ?? src.crosspostParent ?? null,
        crosspost_parent_list: src.crosspost_parent_list ?? src.crosspostParentList ?? undefined,
        is_crosspost: src.is_crosspost ?? src.isCrosspost ?? false,
        media: src.media ?? src.secure_media ?? src.secureMedia,
        secure_media: src.secure_media ?? src.secureMedia,
        preview: src.preview,
        gallery_data: src.galleryData ?? src.gallery_data,
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Devvit API returns untyped Comment objects
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
    return transformedComments.sort((a, b) => b.ups - a.ups).slice(0, limit);
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
    stickied?: boolean;
    distinguished?: string | null;
    locked?: boolean;
    /** Set when post is a crosspost from another subreddit */
    crosspost_parent?: string | null;
    /** Reddit API: array of parent post data when this is a crosspost */
    crosspost_parent_list?: unknown[];
    /** Reddit API: true when post is a crosspost */
    is_crosspost?: boolean;
    media?: {
      reddit_video?: {
        fallback_url?: string;
      };
    };
    secure_media?: {
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

/** Minimum number of candidate posts to fetch so we still get 5 after quality filters */
const CANDIDATE_POST_LIMIT = 30;

/**
 * Fetch video fallback_url from Reddit's public JSON API when Devvit API omits media.
 * Used as fallback for video posts that lack media.reddit_video in the listing response.
 */
async function fetchVideoUrlFromRedditJson(postId: string): Promise<string | null> {
  try {
    const url = `https://www.reddit.com/comments/${postId}.json?limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HowHivemindRU/1.0 (Devvit app)' },
    });
    if (!res.ok) return null;
    type RedditJsonPost = {
      media?: { reddit_video?: { fallback_url?: string } };
      secure_media?: { reddit_video?: { fallback_url?: string } };
    };
    type RedditJsonListing = { data?: { children?: Array<{ data?: RedditJsonPost }> } };
    const json = (await res.json()) as RedditJsonListing[];
    const postData = json?.[0]?.data?.children?.[0]?.data;
    const fallback =
      postData?.media?.reddit_video?.fallback_url ??
      postData?.secure_media?.reddit_video?.fallback_url;
    return fallback ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch hot posts from a subreddit using Devvit's built-in Reddit API.
 * Filters out NSFW, stickied, mod/distinguished, locked, and crossposts.
 */
export async function fetchSubredditPosts(
  subreddit: string,
  limit: number = CANDIDATE_POST_LIMIT
): Promise<RedditPost['data'][]> {
  const posts = await fetchSubredditPostsWithDevvitAPI(subreddit, limit);

  return posts.filter((post) => {
    if (!post.title || post.title === '[deleted]' || post.title === '[removed]') {
      return false;
    }
    if (post.over_18) return false;
    if (post.stickied) return false;
    if (post.distinguished === 'moderator' || post.distinguished === 'admin') return false;
    if (post.locked) return false;
    if (post.crosspost_parent) return false;
    if (post.is_crosspost) return false;
    if (
      post.crosspost_parent_list &&
      Array.isArray(post.crosspost_parent_list) &&
      post.crosspost_parent_list.length > 0
    )
      return false;
    return true;
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
 * Enrich posts with video URLs from Reddit JSON API when Devvit listing omits media.
 */
async function enrichPostsWithVideoUrls(
  posts: RedditPost['data'][]
): Promise<RedditPost['data'][]> {
  const needsEnrichment = posts.filter((p) => {
    const isVideo = p.is_video || /^https?:\/\/v\.redd\.it\//.test(p.url ?? '');
    const hasFallback =
      p.media?.reddit_video?.fallback_url ?? p.secure_media?.reddit_video?.fallback_url;
    return isVideo && !hasFallback;
  });
  if (needsEnrichment.length === 0) return posts;

  const enriched = await Promise.all(
    posts.map(async (post) => {
      const isVideo = post.is_video || /^https?:\/\/v\.redd\.it\//.test(post.url ?? '');
      const hasFallback =
        post.media?.reddit_video?.fallback_url ?? post.secure_media?.reddit_video?.fallback_url;
      if (!isVideo || hasFallback) return post;

      const fallback = await fetchVideoUrlFromRedditJson(post.id);
      if (!fallback) return post;

      return {
        ...post,
        media: {
          ...post.media,
          reddit_video: { ...post.media?.reddit_video, fallback_url: fallback },
        },
      } as RedditPost['data'];
    })
  );
  return enriched;
}

/**
 * Extract video URL from a Reddit post.
 * Returns { direct, embed } - direct for native video (<video>), embed for YouTube etc (<iframe>).
 */
function extractVideoUrls(post: RedditPost['data']): {
  direct: string | null;
  embed: string | null;
} {
  const result = { direct: null as string | null, embed: null as string | null };

  // Native Reddit video (v.redd.it)
  const isVReddit = post.is_video || /^https?:\/\/v\.redd\.it\//.test(post.url ?? '');
  if (isVReddit) {
    const fallback =
      post.media?.reddit_video?.fallback_url ?? post.secure_media?.reddit_video?.fallback_url;
    if (fallback) {
      result.direct = fallback;
      return result;
    }
    const vRedditMatch = post.url?.match(/^https?:\/\/v\.redd\.it\/([a-zA-Z0-9]+)\/?/);
    if (vRedditMatch) {
      result.direct = `https://v.redd.it/${vRedditMatch[1]}/DASH_720`;
      return result;
    }
  }

  // YouTube link posts (youtube.com/watch?v=, youtu.be/, youtube.com/shorts/)
  const ytMatch =
    post.url?.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    ) ?? null;
  if (ytMatch) {
    result.embed = `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  return result;
}

/**
 * Require at least 3 comments and a clear upvote winner (top > 2nd).
 */
function hasClearWinner(comments: RedditComment['data'][]): boolean {
  if (comments.length < 3) return false;
  const [first, second] = comments;
  return first != null && second != null && first.ups > second.ups;
}

/**
 * Total character length of OP (title + selftext) plus top 3 comment bodies.
 * Used to prefer shorter content to reduce scrolling. Returns Infinity if post doesn't qualify.
 */
function getContentLength(
  post: RedditPost['data'],
  commentsMap: Map<string, RedditComment['data'][]>
): number {
  const comments = commentsMap.get(post.id) ?? [];
  if (comments.length < 3 || !hasClearWinner(comments)) return Number.POSITIVE_INFINITY;
  const opLength = (post.title ?? '').length + (post.selftext ?? '').length;
  const commentLength = comments.slice(0, 3).reduce((sum, c) => sum + (c.body ?? '').length, 0);
  return opLength + commentLength;
}

/**
 * Transform Reddit post and comments into quiz question format.
 * Only includes posts with ≥3 comments and a clear top comment (top upvotes > 2nd).
 */
export function transformToQuizFormat(
  posts: RedditPost['data'][],
  commentsMap: Map<string, RedditComment['data'][]>
): QuizQuestion[] {
  const quizQuestions: QuizQuestion[] = [];

  for (const post of posts) {
    const comments = commentsMap.get(post.id) || [];
    if (comments.length < 3 || !hasClearWinner(comments)) {
      continue;
    }

    const imageUrls = extractImageUrls(post);
    const { direct: videoUrl, embed: videoEmbedUrl } = extractVideoUrls(post);

    const quizQuestion: QuizQuestion = {
      postId: post.id,
      title: post.title,
      ...(post.selftext && { selftext: post.selftext }),
      ...(post.url && { url: post.url }),
      ...(imageUrls[0] && { imageUrl: imageUrls[0] }),
      ...(imageUrls.length > 0 && { imageUrls }),
      isVideo: post.is_video || !!videoUrl || !!videoEmbedUrl,
      ...(videoUrl && { videoUrl }),
      ...(videoEmbedUrl && { videoEmbedUrl }),
      author: post.author,
      permalink: post.permalink.startsWith('http')
        ? post.permalink
        : `https://www.reddit.com${post.permalink}`,
      comments: comments.slice(0, 3).map((comment) => ({
        id: comment.id,
        body: comment.body,
        ups: comment.ups,
        author: comment.author,
      })),
    };

    quizQuestions.push(quizQuestion);
    if (quizQuestions.length >= 5) break;
  }

  return quizQuestions;
}

/**
 * Fetch one qualifying quiz question for a subreddit, excluding given post IDs.
 * Used to replace reported (inappropriate) questions.
 */
export async function getReplacementQuestion(
  subreddit: string,
  excludePostIds: string[]
): Promise<QuizQuestion | null> {
  const excludeSet = new Set(excludePostIds.map((id) => id.trim()).filter(Boolean));
  const posts = (await fetchSubredditPosts(subreddit)).filter((p) => !excludeSet.has(p.id));
  if (posts.length === 0) return null;

  const commentPromises = posts.map((post) => {
    const postId = (post as { originalId?: string; id: string }).originalId || post.id;
    const fullPostId = postId.startsWith('t3_') ? postId : `t3_${postId}`;
    return fetchPostComments(subreddit, fullPostId, 5).catch(() => []);
  });
  const commentsArrays = await Promise.all(commentPromises);
  const commentsMap = new Map<string, RedditComment['data'][]>();
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const comments = commentsArrays[i];
    if (post && comments && comments.length > 0) commentsMap.set(post.id, comments);
  }
  const sortedPosts = [...posts].sort(
    (a, b) => getContentLength(a, commentsMap) - getContentLength(b, commentsMap)
  );
  const enrichedPosts = await enrichPostsWithVideoUrls(sortedPosts);
  const questions = transformToQuizFormat(enrichedPosts, commentsMap);
  return questions[0] ?? null;
}

/**
 * Fetch quiz data for a subreddit.
 * Fetches more candidate posts so we still get 5 questions after filtering
 * (NSFW, stickied, mod, locked, crosspost, and "clear winner" comment requirement).
 * Among qualifying posts, picks the 5 with shortest OP + top 3 comments to reduce scrolling.
 */
export async function fetchQuizData(subreddit: string): Promise<QuizQuestion[]> {
  const posts = await fetchSubredditPosts(subreddit);

  if (!posts || posts.length === 0) {
    throw new Error(
      `No posts found in r/${subreddit}. The subreddit may not exist, may be private, or may not have any posts.`
    );
  }

  // Fetch comments for each post in parallel
  // Note: getComments needs the full post ID in t3_xxxxx format
  // We only need 3 comments per post, so fetch 5 to have some buffer
  const commentPromises = posts.map((post) => {
    // Get the original post ID (might be stored in originalId or we need to reconstruct it)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- post may have originalId from cache
    const postId = (post as any).originalId ?? post.id;
    // Ensure it's in t3_ format for getComments
    const fullPostId = postId.startsWith('t3_') ? postId : `t3_${postId}`;

    return fetchPostComments(subreddit, fullPostId, 5).catch((error) => {
      console.error(`Failed to fetch comments for post ${post.id}:`, error);
      return []; // Return empty array on error - post will be skipped
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

  // Prefer shortest OP + comments to reduce scrolling; pick 5 from the shortest qualifying posts
  const sortedPosts = [...posts].sort(
    (a, b) => getContentLength(a, commentsMap) - getContentLength(b, commentsMap)
  );
  const enrichedPosts = await enrichPostsWithVideoUrls(sortedPosts);
  const quizQuestions = transformToQuizFormat(enrichedPosts, commentsMap);

  if (quizQuestions.length < 5) {
    throw new Error(
      quizQuestions.length === 0
        ? `Could not generate quiz questions for r/${subreddit}. Posts may be filtered out (NSFW, stickied, mod, locked, crosspost) or lack enough comments with a clear top answer.`
        : `Could not find 5 qualifying questions for r/${subreddit}. Only ${quizQuestions.length} passed filters (NSFW/stickied/mod/locked/crosspost/clear-winner). Try another subreddit or time.`
    );
  }

  return quizQuestions;
}
