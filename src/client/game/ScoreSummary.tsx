import { useEffect, useState } from 'react';
import { context, navigateTo } from '@devvit/web/client';

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

export const ScoreSummary = ({ score, totalQuestions, subreddit, allowShare, onRestart }: ScoreSummaryProps) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [strategyText, setStrategyText] = useState('');

  const postId = context?.postId;
  // Subscribe to the game's subreddit, not the daily challenge subreddit
  const gameSubreddit = 'how_hivemind_r_u';

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

  // Determine message based on score
  const getScoreMessage = () => {
    const percentage = Math.round((score / totalQuestions) * 100);
    if (percentage === 100) return "Perfect score! You're a Reddit hivemind master!";
    if (percentage >= 80) return "Excellent! You really understand the Reddit hivemind!";
    if (percentage >= 60) return "Great job! You're getting the hang of it!";
    if (percentage >= 40) return "Not bad! Keep practicing!";
    return "Keep trying! The hivemind is tricky!";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center p-4 relative">
      {showConfetti && <Confetti />}
      
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border-2 border-orange-200 p-6 relative z-10">
        <div className="text-center">
          {/* Score Display */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Quiz Complete!
            </h2>
            <div className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2">
              {score}/{totalQuestions}
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              {getScoreMessage()}
            </p>
          </div>

          {/* Share Score Form - only on first completion; after Play Again, score is locked in */}
          {allowShare ? (
            <form onSubmit={handleShareScore} className="mb-4">
              <textarea
                value={strategyText}
                onChange={(e) => setStrategyText(e.target.value)}
                placeholder="What was your strategy?"
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
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Subscribing...
                </>
              ) : subscribeSuccess ? (
                'Subscribed!'
              ) : (
                `Subscribe to r/${gameSubreddit}`
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
