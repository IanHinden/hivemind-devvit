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
