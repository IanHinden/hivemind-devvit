import { reddit, redis } from '@devvit/web/server';
import { getDailySubreddit, type ApprovedSubreddit } from '../../shared/config/subreddits';

export const createPost = async (subreddit?: ApprovedSubreddit) => {
  // Use provided subreddit or get today's subreddit
  const dailySubreddit = subreddit || getDailySubreddit();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const post = await reddit.submitCustomPost({
    title: `How Hivemind r/ You? - Today's Challenge: r/${dailySubreddit}`,
    entry: 'game', // Go directly to game, no splash screen
  });
  
  // Auto-approve the post so it doesn't require manual moderation
  // This ensures daily posts appear immediately without mod intervention
  try {
    await reddit.approve(post.id);
    console.log(`Auto-approved post ${post.id}`);
  } catch (error) {
    // If approval fails (e.g., app doesn't have mod permissions), log but don't fail
    console.warn(`Failed to auto-approve post ${post.id}:`, error);
    // Post will still be created, just may need manual approval
  }
  
  // Store post metadata (date and subreddit) so we can load the correct quiz later
  // Key format: post_meta:{postId}
  // This allows old posts to load their original quiz
  const postMetaKey = `post_meta:${post.id}`;
  const postMeta = {
    date: today,
    subreddit: dailySubreddit,
    createdAt: new Date().toISOString(),
  };
  
  // Store for 30 days (same as quiz cache)
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 30);
  await redis.set(postMetaKey, JSON.stringify(postMeta), { expiration });
  
  console.log(`Stored post metadata for post ${post.id}: date=${today}, subreddit=${dailySubreddit}`);
  
  return post;
};
