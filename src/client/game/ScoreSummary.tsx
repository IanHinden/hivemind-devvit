import React, { useEffect, useState } from 'react';
import { context, navigateTo } from '@devvit/web/client';
import { OFFICIAL_SUBREDDIT } from '../../shared/config/subreddits';

const DISCUSSION_QUESTIONS = [
  'What was your strategy?',
  'Which question was hardest?',
  'Did any answer surprise you?',
  "What's your go-to strategy for guessing the top comment?",
  'Share a tip for future players.',
  'Which subreddit would you add to the rotation?',
  'What made you pick the answers you did?',
] as const;

type ScoreSummaryProps = {
  score: number;
  totalQuestions: number;
  subreddit: string;
  allowShare: boolean;
  onRestart: () => void;
};

// Simple confetti effect using CSS animations
const Confetti = () => {
  const confettiCount = 50;
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: confettiCount }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2 + Math.random() * 2;
        const color = colors[Math.floor(Math.random() * colors.length)];

        return (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-sm"
            style={{
              left: `${left}%`,
              top: '-10px',
              backgroundColor: color,
              animation: `confetti-fall ${duration}s linear ${delay}s forwards`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export const ScoreSummary = ({
  score,
  totalQuestions,
  subreddit,
  allowShare,
  onRestart,
}: ScoreSummaryProps) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [strategyText, setStrategyText] = useState('');
  const [discussionQuestion] = useState(
    () =>
      DISCUSSION_QUESTIONS[Math.floor(Math.random() * DISCUSSION_QUESTIONS.length)] ??
      'What was your strategy?'
  );

  const postId = context?.postId;
  // subscribeToCurrentSubreddit() subscribes to the subreddit where the post lives — label must match
  const currentSubreddit = (context as { subredditName?: string } | undefined)?.subredditName;
  const subscribeSubredditLabel = currentSubreddit ?? OFFICIAL_SUBREDDIT;

  // Hide confetti after animation completes
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleShareScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strategyText.trim()) return;

    if (!postId) {
      console.error('Post ID is not available. Cannot share score.');
      alert('Unable to share score: Post ID not found. Please try again.');
      return;
    }

    setShareLoading(true);
    try {
      const response = await fetch('/api/share-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: postId,
          score: score,
          totalQuestions: totalQuestions,
          subreddit: subreddit,
          strategy: strategyText.trim(),
          question: discussionQuestion,
        }),
      });

      if (response.ok) {
        setShareSuccess(true);
        setStrategyText('');
        setTimeout(() => setShareSuccess(false), 3000);
      } else {
        console.error('Failed to share score');
      }
    } catch (error) {
      console.error('Error sharing score:', error);
    } finally {
      setShareLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribeLoading(true);
    try {
      // subscribeToCurrentSubreddit() subscribes to the current subreddit (where the post is)
      // No need to pass subreddit name
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        setSubscribeSuccess(true);
        setTimeout(() => setSubscribeSuccess(false), 3000);
      } else {
        console.error('Failed to subscribe');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
    } finally {
      setSubscribeLoading(false);
    }
  };

  // Reddit personality messages (from web version)
  const getScoreDisplay = () => {
    const percentage = Math.round((score / totalQuestions) * 100);
    type Display = { message: string; color: string };
    let display: Display;

    if (percentage === 0) {
      display = {
        message:
          "Do you remember that scene in Enter the Spiderverse where Miles gets a 0 on the test on purpose? I'm just saying it's a bit suspicious... Like, statistically, you should have gotten at least one correct.",
        color: 'text-red-500',
      };
    } else if (percentage <= 12.5) {
      display = {
        message:
          "The bad news: you don't think like a Redditor. The good news: you don't think like a Redditor.",
        color: 'text-red-500',
      };
    } else if (percentage <= 25) {
      display = {
        message:
          "That wasn't great. ARE YOU FUCKING SORRY!? The worst part is you don't even know what I'm talking about.",
        color: 'text-red-400',
      };
    } else if (percentage <= 37.5) {
      display = {
        message:
          'You need to work harder. Get off the time-wasting social media sites and get on the time-wasting news aggregate.',
        color: 'text-orange-500',
      };
    } else if (percentage <= 50) {
      display = {
        message: "Pretty average! You're doing about this well. (Note: I'm holding up a banana)",
        color: 'text-blue-600',
      };
    } else if (percentage <= 62.5) {
      display = {
        message:
          "Keep trying! I know you want to be a Redditor, but unfortunately, you're still a normie. Go home and be a family person.",
        color: 'text-green-500',
      };
    } else if (percentage <= 75) {
      display = {
        message:
          "Great! I can only assume you already checked Reddit this morning when you woke up! Studies show that's bad for your health, but it's good for this quiz!",
        color: 'text-green-600',
      };
    } else if (percentage === 87.5) {
      display = {
        message:
          '¡Muy bien! ¡Tienes un buen sentido de la cultura de Reddit! Espera, ¿cómo puedo volver a ponerlo en inglés?',
        color: 'text-purple-600',
      };
    } else {
      display = {
        message:
          'Wow. It was nice of you to find time in between moderating all those subreddits to take this quiz. You are the ultimate Redditor, a being of pure fedora. You have the soul of a Redditor in place of the soul of um a regular person. You narwhal all your bacons at midnight and everything else that goes with that.',
        color: 'text-green-600',
      };
    }

    return display;
  };

  const scoreDisplay = getScoreDisplay();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center p-4 relative">
      {showConfetti && <Confetti />}

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border-2 border-orange-200 p-6 relative z-10">
        <div className="text-center">
          {/* Score Display */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz Complete!</h2>
            <div className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-3">
              {score}/{totalQuestions}
            </div>
            <p className={`text-sm font-semibold ${scoreDisplay.color} leading-relaxed`}>
              {scoreDisplay.message}
            </p>
          </div>

          {/* Share Score Form - only on first completion; after Play Again, score is locked in */}
          {allowShare ? (
            <form onSubmit={handleShareScore} className="mb-4">
              <textarea
                value={strategyText}
                onChange={(e) => setStrategyText(e.target.value)}
                placeholder={discussionQuestion}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none resize-none text-sm"
                rows={3}
                disabled={shareLoading || shareSuccess}
              />
              <button
                type="submit"
                disabled={shareLoading || shareSuccess || !strategyText.trim()}
                className={`w-full mt-2 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 transform hover:scale-[1.02] shadow-md ${
                  shareLoading || shareSuccess || !strategyText.trim()
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white hover:shadow-lg'
                }`}
              >
                {shareLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Posting comment...
                  </>
                ) : shareSuccess ? (
                  'Score posted in comments!'
                ) : (
                  'Share Score to Thread'
                )}
              </button>
            </form>
          ) : (
            <p className="mb-4 text-sm text-gray-600">
              Your score is locked in. Replaying is just for fun!
            </p>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={handleSubscribe}
              disabled={subscribeLoading || subscribeSuccess}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 transform hover:scale-[1.02] shadow-md ${
                subscribeLoading || subscribeSuccess
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white hover:shadow-lg'
              }`}
            >
              {subscribeLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Subscribing...
                </>
              ) : subscribeSuccess ? (
                'Subscribed!'
              ) : (
                `Subscribe to r/${subscribeSubredditLabel}`
              )}
            </button>

            <button
              type="button"
              onClick={() => navigateTo(`https://www.reddit.com/r/${subreddit}`)}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
            >
              Visit r/{subreddit}
            </button>

            <button
              type="button"
              onClick={onRestart}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
