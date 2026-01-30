import { useState, useMemo } from 'react';
import { navigateTo } from '@devvit/web/client';
import type { QuizQuestion } from '../../shared/types/api';

type QuizQuestionProps = {
  question: QuizQuestion;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  isLastQuestion: boolean;
};

export const QuizQuestionComponent = ({
  question,
  onAnswer,
  onNext,
  isLastQuestion,
}: QuizQuestionProps) => {
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const topComment = question.comments[0];
  const topCommentId = topComment?.id;

  if (!topComment) {
    return (
      <div className="text-center p-4">
        <p className="text-red-600">No comments available for this question.</p>
      </div>
    );
  }

  // Shuffle comments once when component mounts (useMemo with stable dependencies)
  const shuffledComments = useMemo(() => {
    if (!question.comments || question.comments.length === 0) {
      return [];
    }
    // Create a copy and shuffle using Fisher-Yates algorithm
    const shuffled = [...question.comments];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
    return shuffled;
  }, [question.postId]); // Only reshuffle if postId changes

  const handleAnswerSelect = (commentId: string) => {
    if (showAnswer) return;

    setSelectedCommentId(commentId);
    setShowAnswer(true);

    const correct = commentId === topCommentId;
    setIsCorrect(correct);
    onAnswer(correct);
  };

  const handleViewThread = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Permalink might already include the full URL or just the path
    const url = question.permalink.startsWith('http')
      ? question.permalink
      : `https://www.reddit.com${question.permalink}`;

    // Copy URL to clipboard since window.open is blocked in Devvit's sandbox
    try {
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
      // Reset the "copied" message after 3 seconds
      setTimeout(() => setUrlCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      // Fallback: try to navigate in the same tab
      try {
        navigateTo(url);
      } catch (navError) {
        console.error('Navigation error:', navError);
      }
    }
  };

  return (
    <div>
      {/* Question */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-3">{question.title}</h2>

        {question.selftext && (
          <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap leading-relaxed">
            {question.selftext}
          </p>
        )}

        {question.imageUrl && (
          <img src={question.imageUrl} alt="Post" className="max-w-full h-auto rounded-lg mb-4" />
        )}

        <p className="text-sm text-gray-500 mb-6">Can you guess the top comment?</p>
      </div>

      {/* Answer options */}
      <div className="space-y-3 mb-6">
        {shuffledComments.map((comment) => {
          const isSelected = selectedCommentId === comment.id;
          const isTopComment = comment.id === topCommentId;

          let buttonClass = 'w-full p-4 text-left border-2 rounded-lg transition-all duration-200 ';

          if (showAnswer) {
            if (isTopComment) {
              buttonClass += 'bg-green-100 border-green-500 text-green-800';
            } else if (isSelected) {
              buttonClass += 'bg-red-100 border-red-500 text-red-800';
            } else {
              buttonClass += 'bg-gray-50 border-gray-300 text-gray-600';
            }
          } else {
            buttonClass += isSelected
              ? 'bg-blue-100 border-blue-500 text-blue-800'
              : 'bg-white border-gray-300 hover:border-orange-400 hover:bg-orange-50 text-gray-800 cursor-pointer';
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
                  {/* Only show author and upvotes after answer is revealed */}
                  {showAnswer && comment.author && (
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

      {/* Feedback */}
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

          {/* View on Reddit link */}
          <div className="mt-4 text-center relative z-10">
            <button
              onClick={handleViewThread}
              type="button"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-none p-2 -m-2 relative z-10 font-medium"
            >
              {urlCopied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-green-600">URL copied! Paste in a new tab</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Copy thread URL</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      {showAnswer && (
        <button
          onClick={onNext}
          className="w-full py-3 px-4 rounded-md font-medium bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
        </button>
      )}
    </div>
  );
};
