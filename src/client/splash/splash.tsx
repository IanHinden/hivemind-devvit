import '../index.css';

import { navigateTo } from '@devvit/web/client';
import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <div className="min-h-full h-full overflow-hidden touch-none flex flex-col bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Main card area - fills viewport, stays non-scrollable */}
      <div className="flex flex-1 flex-col justify-center items-center gap-4 px-5 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            className="object-contain w-28 h-28 drop-shadow-sm"
            src="/logo.png"
            alt=""
            loading="eager"
            decoding="async"
          />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            How Hivemind r/ You?
          </h1>
          <p className="text-sm text-gray-600 max-w-[260px] leading-snug">
            Guess the top comment on recent Reddit posts. Tap below to play.
          </p>
        </div>
        <button
          className="mt-1 flex items-center justify-center bg-[#d93900] hover:bg-[#c23300] active:scale-[0.98] text-white font-semibold text-base w-full max-w-[240px] h-12 rounded-full cursor-pointer transition-colors shadow-md"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          Play now
        </button>
      </div>
      {/* Compact footer - no scroll, just a single line */}
      <div className="shrink-0 flex items-center justify-center gap-2 py-2 text-[0.7rem] text-gray-500 border-t border-gray-100">
        <button
          className="cursor-pointer hover:text-gray-700"
          onClick={() => navigateTo('https://developers.reddit.com/docs')}
        >
          Docs
        </button>
        <span className="text-gray-300">·</span>
        <button
          className="cursor-pointer hover:text-gray-700"
          onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
        >
          r/Devvit
        </button>
        <span className="text-gray-300">·</span>
        <button
          className="cursor-pointer hover:text-gray-700"
          onClick={() => navigateTo('https://discord.com/invite/R7yu2wh9Qz')}
        >
          Discord
        </button>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
