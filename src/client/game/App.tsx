import { useState } from 'react';
import { navigateTo } from '@devvit/web/client';
import type { QuizResponse, QuizQuestion } from '../../shared/types/api';

const DEFAULT_SUBREDDITS = [
  'AskReddit',
  'pics',
  'todayilearned',
  'explainlikeimfive',
  'webdev',
  'Showerthoughts',
  'LifeProTips',
  'mildlyinteresting',
  'gifs',
] as const;

export const App = () => {
  const [selectedSubreddit, setSelectedSubreddit] = useState<string>('AskReddit');
  const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);

  const loadQuiz = async (subreddit: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quiz?subreddit=${encodeURIComponent(subreddit)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Failed to load quiz: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data: QuizResponse = await response.json();
      setQuizData(data.quiz);
      setQuizStarted(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load quiz. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    loadQuiz(selectedSubreddit);
  };

  const handleRestart = () => {
    setQuizStarted(false);
    setQuizData([]);
    setError(null);
  };

  // Quiz hasn't started - show subreddit selector
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
            How Hivemind r/ You?
          </h1>
          <p className="text-gray-600 text-center mb-6">
            Can you guess the top comment on recent Reddit posts?
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="subreddit" className="block text-sm font-medium text-gray-700 mb-2">
                Choose a Subreddit
              </label>
              <select
                id="subreddit"
                value={selectedSubreddit}
                onChange={(e) => setSelectedSubreddit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                disabled={loading}
              >
                {DEFAULT_SUBREDDITS.map((sub) => (
                  <option key={sub} value={sub}>
                    r/{sub}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <button
              onClick={handleStartQuiz}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-md font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading Quiz...
                </>
              ) : (
                'Start Quiz'
              )}
            </button>

            {!loading && (
              <p className="text-xs text-gray-500 text-center">
                Quiz will include up to 8 questions from recent popular posts
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Quiz has started - show quiz content (placeholder for now)
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Quiz Started!
          </h2>
          <p className="text-gray-600 mb-4">
            {quizData.length} questions loaded from r/{selectedSubreddit}
          </p>
          <button
            onClick={handleRestart}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium py-2 px-4 rounded transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
};
