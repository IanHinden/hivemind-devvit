#!/usr/bin/env node
/**
 * Clear quiz cache. Run while npm run dev is active.
 * Requires ADMIN_SECRET in .env (npm run clear-cache loads it via dotenv-cli).
 * Usage: npm run clear-cache [-- subreddit [port]]
 * Examples:
 *   npm run clear-cache -- funny      # Clear r/funny on port 8080
 *   npm run clear-cache -- funny 3000  # Clear r/funny on port 3000
 *   npm run clear-cache              # Clear all caches
 */
const subreddit = process.argv[2];
const portArg = process.argv[3];
const secret = process.env.ADMIN_SECRET;
if (!secret) {
  console.error('ADMIN_SECRET must be set in .env. Run: npm run clear-cache');
  process.exit(1);
}
const ports = portArg ? [parseInt(portArg, 10)] : [8080, 3000, 1234, 8081].filter(Boolean);
const url = (p) => {
  const base = `http://localhost:${p}/api/clear-cache`;
  const params = new URLSearchParams();
  if (secret) params.set('key', secret);
  if (subreddit) params.set('subreddit', subreddit);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
};

let lastErr;
for (const port of ports) {
  try {
    const res = await fetch(url(port), { method: 'GET' });
    const data = await res.json();
    console.log(data.message ?? data);
    process.exit(0);
  } catch (err) {
    lastErr = err;
  }
}
console.error('Failed to clear cache. Ensure ADMIN_SECRET is set in .env and the server is running.');
console.error(lastErr?.message ?? '');
process.exit(1);
