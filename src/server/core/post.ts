import { reddit } from '@devvit/web/server';
import { getDailySubreddit } from '../../shared/config/subreddits';

export const createPost = async () => {
  const dailySubreddit = getDailySubreddit();
  return await reddit.submitCustomPost({
    title: `How Hivemind r/ You? - Today's Challenge: r/${dailySubreddit}`,
    entry: 'game', // Go directly to game, no splash screen
  });
};
