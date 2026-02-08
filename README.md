# How Hivemind r/ You?

A Reddit quiz game that tests how well you know the hivemind. Can you guess the top comment?

## Overview

**How Hivemind r/ You?** is a daily quiz app that runs inside Reddit posts. Each day features a different subreddit from our curated list. You’ll see a Reddit post with three comment options—your job is to pick the one that got the most upvotes.

### How to Play

1. Open the app from a post in r/how_hivemind_r_u
2. Read the post (image, video, or text) and the three comment options
3. Tap the comment you think is the top-voted one
4. See if you were right and get Reddit-flavored feedback
5. Complete all 5 questions to see your score and share it in the comments

### Features

- **Daily challenge** – A new subreddit each day (e.g. r/Unexpected, r/rareinsults, r/ihadastroke)
- **5 questions per quiz** – Short, focused rounds
- **Share your score** – Post your score and strategy to the thread
- **Subscribe** – One-tap subscribe to r/how_hivemind_r_u for new daily posts

### For Reddit Users

If you spend time on Reddit and like guessing games, this is for you. No account setup required—just open the post and play.

---

## Tech Stack (Developers)

- [Devvit](https://developers.reddit.com/): A way to build and deploy immersive games on Reddit
- [Vite](https://vite.dev/): For compiling the webView
- [React](https://react.dev/): For UI
- [Express](https://expressjs.com/): For backend logic
- [Tailwind](https://tailwindcss.com/): For styles
- [Typescript](https://www.typescriptlang.org/): For type safety

## Getting Started

> Make sure you have Node 22 downloaded on your machine before running!

1. Run `npm create devvit@latest --template=react`
2. Go through the installation wizard. You will need to create a Reddit account and connect it to Reddit developers
3. Copy the command on the success page into your terminal

## Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit.
- `npm run build`: Builds your client and server projects
- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit
- `npm run check`: Type checks, lints, and prettifies your app

## Cursor Integration

This template comes with a pre-configured cursor environment. To get started, [download cursor](https://www.cursor.com/downloads) and enable the `devvit-mcp` when prompted.

## Data Fetching

This app uses **Devvit's native Reddit API** (`reddit.getHotPosts()` and `reddit.getComments()`) to fetch quiz data. No external HTTP fetch calls are made to Reddit's public API, so no domain permissions are required in `devvit.json`.

**Quiz Data Source:**

- The game fetches hot posts and top comments from Reddit subreddits using Devvit's built-in `reddit` object
- Daily quiz caching is implemented using Devvit's Redis cache, ensuring all users get the same quiz questions each day
- Cache automatically expires at midnight and refreshes with new data
