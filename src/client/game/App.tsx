import { useState } from 'react';
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);

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
    setCurrentQuestionIndex(0);
    setSelectedCommentId(null);
    setShowAnswer(false);
    setScore(0);
  };

  const handleClearCache = async () => {
    try {
      const response = await fetch('/api/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddit: selectedSubreddit }),
      });
      
      const data = await response.json();
      if (response.ok) {
        alert(`✅ ${data.message}`);
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      console.error('Failed to clear cache:', err);
      alert('❌ Failed to clear cache');
    }
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
                Quiz will include 5 questions from recent popular posts
              </p>
            )}

            {/* Clear cache button for testing */}
            <button
              onClick={handleClearCache}
              className="w-full py-2 px-4 rounded-md font-medium text-sm bg-yellow-200 hover:bg-yellow-300 text-yellow-800 transition-colors"
              title="Clear cache for this subreddit (useful for testing)"
            >
              🗑️ Clear Cache
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz has started - show quiz questions
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

  const topComment = currentQuestion.comments[0];
  
  if (!topComment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              No Comments Available
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

  const handleAnswerSelect = (commentId: string) => {
    if (showAnswer) return; // Don't allow selection after answer is shown
    
    setSelectedCommentId(commentId);
    setShowAnswer(true);
    
    // Check if correct (selected the top comment)
    if (commentId === topComment.id) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedCommentId(null);
      setShowAnswer(false);
    }
  };

  const handleFinishQuiz = () => {
    handleRestart();
  };

  const isLastQuestion = currentQuestionIndex === quizData.length - 1;
  const isCorrect = selectedCommentId === topComment.id;

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

        {/* Question */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {currentQuestion.title}
          </h2>
          
          {currentQuestion.selftext && (
            <p className="text-gray-700 mb-4 whitespace-pre-wrap">
              {currentQuestion.selftext}
            </p>
          )}

          {currentQuestion.imageUrl && (
            <img
              src={currentQuestion.imageUrl}
              alt="Post"
              className="max-w-full h-auto rounded-lg mb-4"
            />
          )}

          <p className="text-sm text-gray-500 mb-6">
            Can you guess the top comment?
          </p>
        </div>

        {/* Answer options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.comments.map((comment) => {
            const isSelected = selectedCommentId === comment.id;
            const isTopComment = comment.id === topComment.id;
            
            let buttonClass = "w-full p-4 text-left border-2 rounded-lg transition-all duration-200 ";
            
            if (showAnswer) {
              if (isTopComment) {
                buttonClass += "bg-green-100 border-green-500 text-green-800";
              } else if (isSelected) {
                buttonClass += "bg-red-100 border-red-500 text-red-800";
              } else {
                buttonClass += "bg-gray-50 border-gray-300 text-gray-600";
              }
            } else {
              buttonClass += isSelected
                ? "bg-blue-100 border-blue-500 text-blue-800"
                : "bg-white border-gray-300 hover:border-orange-400 hover:bg-orange-50 text-gray-800 cursor-pointer";
            }

            return (
              <button
                key={comment.id}
                onClick={() => handleAnswerSelect(comment.id)}
                disabled={showAnswer}
                className={buttonClass}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">
                      {comment.body.length > 200 
                        ? `${comment.body.substring(0, 200)}...` 
                        : comment.body}
                    </p>
                    {comment.author && (
                      <p className="text-xs text-gray-500">
                        u/{comment.author} • {comment.ups} upvotes
                      </p>
                    )}
                  </div>
                  {showAnswer && isTopComment && (
                    <span className="ml-2 text-green-600 font-bold">✓ Top Comment</span>
                  )}
                  {showAnswer && isSelected && !isTopComment && (
                    <span className="ml-2 text-red-600 font-bold">✗</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback and navigation */}
        {showAnswer && (
          <div className="mb-6 p-4 rounded-lg bg-gray-50">
            {isCorrect ? (
              <p className="text-green-700 font-semibold text-center">
                🎉 Correct! That's the top comment!
              </p>
            ) : (
              <p className="text-red-700 font-semibold text-center">
                ❌ Not quite. The top comment was: "{topComment.body.substring(0, 100)}..."
              </p>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleRestart}
            className="flex-1 py-3 px-4 rounded-md font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
          >
            Start Over
          </button>
          
          {showAnswer && (
            <button
              onClick={isLastQuestion ? handleFinishQuiz : handleNextQuestion}
              className="flex-1 py-3 px-4 rounded-md font-medium bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
            </button>
          )}
        </div>

        {/* Final score screen */}
        {showAnswer && isLastQuestion && (
          <div className="mt-6 p-6 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Quiz Complete! 🎉
            </h3>
            <p className="text-lg text-gray-700 mb-4">
              You got {score} out of {quizData.length} questions correct!
            </p>
            <p className="text-sm text-gray-600">
              {score === quizData.length 
                ? "Perfect score! You really know the hivemind!" 
                : score >= quizData.length / 2
                ? "Great job! You're pretty in tune with Reddit."
                : "Not bad! Keep playing to improve your score."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
