import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'How Hivemind r/ You?',
    entry: 'game', // Go directly to game, no splash screen
  });
};
