## Devvit React Starter

A starter to build web applications on Reddit's developer platform

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

## Fetch Domains

This app requests access to the following external domain:

### `api.howhivemindryou.com`

**Purpose:** This domain hosts an Azure Function API that provides quiz data for the "How Hivemind r/ You?" game.

**Why this domain is needed:**

1. **Infrastructure Reuse**: This app is part of a multi-platform game (web and Reddit) that shares backend infrastructure. The Azure Function handles Reddit API fetching, OAuth authentication, rate limiting, and Redis caching that is already built and tested.

2. **Daily Quiz Pre-Generation**: The Reddit version requires daily quiz pre-generation with deterministic caching (same questions for all users each day). This capability is already implemented in the Azure infrastructure with scheduled cache-warmer functions.

3. **Consistency**: By using the same backend API, both the web version (howhivemindryou.com) and Reddit version provide consistent quiz experiences and share the same data sources.

4. **Rate Limiting & Caching**: The Azure Function implements sophisticated rate limiting and Redis caching that prevents Reddit API abuse and improves performance. Replicating this in Devvit would require duplicating infrastructure.

**Usage Compliance:**
- The API is used exclusively for fetching quiz data (Reddit posts and comments)
- All requests are server-to-server (Devvit server → Azure Function)
- No user data is transmitted to the external domain
- The domain serves only this specific game application
- HTTPS is enforced for all requests

**Alternative Considered:**
While Reddit API fetching could theoretically be implemented directly in Devvit, using the existing Azure infrastructure provides better scalability, consistency across platforms, and leverages existing caching/rate limiting infrastructure.
