import { useState } from 'react';
import type { QuizResponse, QuizQuestion, ErrorResponse } from '../../shared/types/api';
import { QuizQuestionComponent } from './QuizQuestion';

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
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);

  const loadQuiz = async (subreddit: string, retryAttempt = 0): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quiz?subreddit=${encodeURIComponent(subreddit)}`);
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({
          status: 'error' as const,
          message: `Failed to load quiz: ${response.status}`,
          type: 'UNKNOWN_ERROR' as const,
          retryable: response.status >= 500,
        }));
        
        // Retry logic for retryable errors
        if (errorData.retryable && retryAttempt < 2) {
          console.log(`Retrying quiz load (attempt ${retryAttempt + 1}/2)...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryAttempt + 1))); // Exponential backoff
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
      setQuizStarted(true);
      setRetryCount(0);
    } catch (err) {
      const errorData: ErrorResponse = err instanceof Error 
        ? {
            status: 'error',
            message: err.message,
            type: 'UNKNOWN_ERROR',
            retryable: true,
          }
        : err as ErrorResponse;
      
      setError(errorData);
      setRetryCount(retryAttempt);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    loadQuiz(selectedSubreddit, 0);
  };

  const handleStartQuiz = () => {
    loadQuiz(selectedSubreddit);
  };

  const handleRestart = () => {
    setQuizStarted(false);
    setQuizData([]);
    setError(null);
    setCurrentQuestionIndex(0);
    setScore(0);
  };

  // Quiz hasn't started - show subreddit selector
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col items-center mb-6">
            <img 
              className="object-contain w-1/2 max-w-[200px] mb-4" 
              src="/logo.png" 
              alt="How Hivemind r/ You?" 
            />
            <p className="text-gray-600 text-center">
              Can you guess the top comment on recent Reddit posts?
            </p>
          </div>
          
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
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
                    <p className="mt-1 text-sm text-red-700">
                      {error.message}
                    </p>
                    {error.suggestion && (
                      <p className="mt-2 text-sm text-red-600">
                        💡 {error.suggestion}
                      </p>
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
                Quiz will include 5 questions from recent popular posts
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
            <svg className="animate-spin mx-auto h-8 w-8 text-orange-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              No Questions Available
            </h2>
            <p className="text-gray-600 mb-4">
              Could not load quiz questions. Please try again.
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
  }

  const currentQuestion = quizData[currentQuestionIndex];
  
  if (!currentQuestion || currentQuestion.comments.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Error Loading Question
            </h2>
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
    if (currentQuestionIndex < quizData.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleRestart();
    }
  };

  const isLastQuestion = currentQuestionIndex === quizData.length - 1;

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
