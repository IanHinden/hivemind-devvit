import { useState, useEffect } from 'react';
import { context } from '@devvit/web/client';
import type {
  QuizResponse,
  QuizQuestion,
  ErrorResponse,
  DailySubredditResponse,
} from '../../shared/types/api';
import { APPROVED_SUBREDDITS } from '../../shared/config/subreddits';
import { QuizQuestionComponent } from './QuizQuestion';
import { ScoreSummary } from './ScoreSummary';

const FALLBACK_SUBREDDIT = APPROVED_SUBREDDITS[0] ?? 'Unexpected';

export const App = () => {
  const [dailySubreddit, setDailySubreddit] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [hasCompletedOnce, setHasCompletedOnce] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);

  // Fetch daily subreddit on mount (pass postId if available to get historical quiz)
  useEffect(() => {
    const fetchDailySubreddit = async () => {
      try {
        // Get post ID from context if available (for historical posts)
        const postId = context?.postId;
        const url = postId
          ? `/api/daily-subreddit?postId=${encodeURIComponent(postId)}`
          : '/api/daily-subreddit';

        const response = await fetch(url);
        if (response.ok) {
          const data: DailySubredditResponse = await response.json();
          setDailySubreddit(data.subreddit);
        } else {
          setDailySubreddit(FALLBACK_SUBREDDIT);
        }
      } catch (err) {
        console.error('Failed to fetch daily subreddit:', err);
        setDailySubreddit(FALLBACK_SUBREDDIT);
      }
    };
    void fetchDailySubreddit();
  }, []);

  const loadQuiz = async (subreddit: string, retryAttempt = 0): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Get post ID from context if available (for historical posts)
      const postId = context?.postId;
      const url = postId
        ? `/api/quiz?subreddit=${encodeURIComponent(subreddit)}&postId=${encodeURIComponent(postId)}`
        : `/api/quiz?subreddit=${encodeURIComponent(subreddit)}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({
          status: 'error' as const,
          message: `Failed to load quiz: ${response.status}`,
          type: 'UNKNOWN_ERROR' as const,
          retryable: response.status >= 500,
        }));

        // Retry logic for retryable errors
        if (errorData.retryable && retryAttempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (retryAttempt + 1))); // Exponential backoff
          return loadQuiz(subreddit, retryAttempt + 1);
        }

        throw errorData;
      }

      const data: QuizResponse = await response.json();

      if (!data.quiz || data.quiz.length === 0) {
        throw {
          status: 'error' as const,
          message: 'No quiz questions were returned',
          type: 'INSUFFICIENT_DATA' as const,
          retryable: true,
          suggestion: 'Try selecting a different subreddit',
        } as ErrorResponse;
      }

      setQuizData(data.quiz);
      if (data.subreddit) setDailySubreddit(data.subreddit);
      setQuizStarted(true);
      setRetryCount(0);
    } catch (err) {
      const errorData: ErrorResponse =
        err instanceof Error
          ? {
              status: 'error',
              message: err.message,
              type: 'UNKNOWN_ERROR',
              retryable: true,
            }
          : (err as ErrorResponse);

      setError(errorData);
      setRetryCount(retryAttempt);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    if (dailySubreddit) {
      void loadQuiz(dailySubreddit, 0);
    }
  };

  const handleStartQuiz = () => {
    if (dailySubreddit) {
      void loadQuiz(dailySubreddit);
    }
  };

  const handleRestart = () => {
    setHasCompletedOnce(true); // Lock score: after Play Again, they can't share again
    setQuizStarted(false);
    setQuizCompleted(false);
    setQuizData([]);
    setError(null);
    setCurrentQuestionIndex(0);
    setScore(0);
  };

  // Quiz hasn't started - show welcome screen with daily subreddit
  if (!quizStarted) {
    // Wait for daily subreddit to load
    if (!dailySubreddit) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <svg
                className="animate-spin mx-auto h-8 w-8 text-orange-500 mb-4"
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
              <p className="text-gray-600">Loading today's challenge...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col items-center mb-6">
            <img
              className="object-contain w-1/2 max-w-[200px] mb-4"
              src="/logo.png"
              alt="How Hivemind r/ You?"
              loading="eager"
              decoding="async"
            />
            <p className="text-gray-600 text-center mb-2">
              Can you guess the top comment on recent Reddit posts?
            </p>
            <div className="mt-2 px-4 py-2 bg-orange-100 rounded-lg">
              <p className="text-sm font-semibold text-orange-800">
                Today's Challenge: <span className="font-bold">r/{dailySubreddit}</span>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800">
                      {error.type === 'SUBREDDIT_NOT_FOUND' && 'Subreddit Not Found'}
                      {error.type === 'INSUFFICIENT_DATA' && 'Not Enough Data'}
                      {error.type === 'RATE_LIMIT' && 'Rate Limited'}
                      {error.type === 'NETWORK_ERROR' && 'Network Error'}
                      {error.type === 'API_ERROR' && 'API Error'}
                      {!error.type && 'Error Loading Quiz'}
                    </h3>
                    <p className="mt-1 text-sm text-red-700">{error.message}</p>
                    {error.suggestion && (
                      <p className="mt-2 text-sm text-red-600">💡 {error.suggestion}</p>
                    )}
                    {error.retryable && retryCount < 2 && (
                      <button
                        onClick={handleRetry}
                        disabled={loading}
                        className="mt-3 text-sm font-medium text-red-800 hover:text-red-900 underline"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
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
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  Loading Quiz...
                </>
              ) : (
                'Start Quiz'
              )}
            </button>

            {!loading && (
              <p className="text-xs text-gray-500 text-center">
                Quiz will include 5 questions from recent popular posts in r/{dailySubreddit}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Quiz has started - show quiz questions
  // Show loading state if still loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <svg
              className="animate-spin mx-auto h-8 w-8 text-orange-500 mb-4"
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
            <p className="text-gray-600">Loading quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  if (quizData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Questions Available</h2>
            <p className="text-gray-600 mb-4">Could not load quiz questions. Please try again.</p>
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
  }

  const currentQuestion = quizData[currentQuestionIndex];

  if (!currentQuestion || currentQuestion.comments.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Error Loading Question</h2>
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
  }

  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      setScore(score + 1);
    }
  };
  const handleNext = () => {
    // Scroll back to top when moving to the next question or finishing the quiz
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (currentQuestionIndex < quizData.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Quiz is complete - show score summary
      setQuizCompleted(true);
    }
  };

  const isLastQuestion = currentQuestionIndex === quizData.length - 1;

  // Show score summary if quiz is completed
  if (quizCompleted && dailySubreddit) {
    return (
      <ScoreSummary
        score={score}
        totalQuestions={quizData.length}
        subreddit={dailySubreddit}
        allowShare={!hasCompletedOnce} // false after they've clicked Play Again
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-6">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {quizData.length}
            </span>
            <span className="text-sm font-semibold text-gray-800">
              Score: {score}/{quizData.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / quizData.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Quiz Question Component - key ensures fresh component for each question */}
        <QuizQuestionComponent
          key={`question-${currentQuestionIndex}-${currentQuestion.postId}`}
          question={currentQuestion}
          onAnswer={handleAnswer}
          onNext={handleNext}
          isLastQuestion={isLastQuestion}
        />

        {/* Start Over button */}
        <div className="mt-6">
          <button
            onClick={handleRestart}
            className="w-full py-3 px-4 rounded-md font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
};
