#!/usr/bin/env node
/**
 * Prints the next subreddit in the daily rotation (tomorrow) and optional upcoming days.
 * Run: node scripts/next-subreddit.mjs [days]
 * Example: node scripts/next-subreddit.mjs 7
 *
 * Logic mirrors src/shared/config/subreddits.ts — keep in sync when changing the rotation.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const subredditsPath = join(__dirname, '../src/shared/config/subreddits.ts');

function getSubredditForDate(date, list) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = dayOfYear % list.length;
  return list[index];
}

// Parse APPROVED_SUBREDDITS from subreddits.ts so we never get out of sync
const src = readFileSync(subredditsPath, 'utf8');
const match = src.match(/APPROVED_SUBREDDITS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
if (!match) {
  console.error('Could not parse APPROVED_SUBREDDITS from', subredditsPath);
  process.exit(1);
}
const list = match[1]
  .split(',')
  .map((s) => s.replace(/^\s*['"]|['"]\s*$/g, '').trim())
  .filter(Boolean);

const daysAhead = Math.min(Math.max(1, parseInt(process.argv[2], 10) || 7), 31);
const today = new Date();

console.log('Today:', today.toISOString().split('T')[0], '→', getSubredditForDate(today, list));
console.log('');
console.log('Next subreddit (tomorrow):', getSubredditForDate(new Date(today.getTime() + 86400000), list));
console.log('');
console.log('Upcoming days:');
for (let i = 1; i <= daysAhead; i++) {
  const d = new Date(today);
  d.setDate(d.getDate() + i);
  const dateStr = d.toISOString().split('T')[0];
  const sub = getSubredditForDate(d, list);
  console.log(' ', dateStr, '→ r/' + sub);
}
