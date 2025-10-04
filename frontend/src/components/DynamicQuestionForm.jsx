import { useState, useEffect } from 'react';
import axios from 'axios';

const DynamicQuestionForm = ({ caseId, sessionId, questions, onComplete, onBack }) => {
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Initialize answers object
    const initialAnswers = {};
    questions.forEach((_, index) => {
      initialAnswers[index] = '';
    });
    setAnswers(initialAnswers);
  }, [questions]);

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: value
    }));
    
    // Clear error for this question
    if (errors[questionIndex]) {
      setErrors(prev => ({
        ...prev,
        [questionIndex]: null
      }));
    }
  };

  const validateCurrentQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestionIndex];
    
    if (currentQuestion.required && (!currentAnswer || currentAnswer.toString().trim() === '')) {
      setErrors(prev => ({
        ...prev,
        [currentQuestionIndex]: 'This field is required'
      }));
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateCurrentQuestion()) {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate all required questions
    let hasErrors = false;
    const newErrors = {};
    
    questions.forEach((question, index) => {
      if (question.required && (!answers[index] || answers[index].toString().trim() === '')) {
        newErrors[index] = 'This field is required';
        hasErrors = true;
      }
    });
    
    if (hasErrors) {
      setErrors(newErrors);
      // Go to first question with error
      const firstErrorIndex = Object.keys(newErrors).map(Number).sort()[0];
      setCurrentQuestionIndex(firstErrorIndex);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${AI_API_URL}/api/submit-answers`, {
        caseId: caseId,
        sessionId: sessionId || 'new-session',
        answers: answers
      });

      if (response.data.success) {
        onComplete(response.data.enhanced_case_data);
      } else {
        console.error('Failed to submit answers:', response.data.error);
        alert('Failed to submit answers. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting answers:', error);
      alert('Error submitting answers. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question, index) => {
    const value = answers[index] || '';
    const hasError = errors[index];

    const baseInputClasses = `w-full px-4 py-3 rounded-lg border transition-all duration-200 ${
      hasError 
        ? 'border-red-500 bg-red-50 focus:ring-red-500' 
        : 'border-gray-300 bg-white focus:ring-blue-500 focus:border-blue-500'
    } focus:ring-2 focus:outline-none`;

    switch (question.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        return (
          <input
            type={question.type}
            value={value}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            placeholder={question.placeholder || ''}
            className={baseInputClasses}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            placeholder={question.placeholder || ''}
            className={`${baseInputClasses} min-h-[120px] resize-vertical`}
            rows={4}
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            className={baseInputClasses}
          >
            <option value="">{question.placeholder || 'Please select an option'}</option>
            {question.options?.map((option, optIndex) => (
              <option key={optIndex} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            className={baseInputClasses}
          />
        );
      
      case 'time':
        return (
          <input
            type="time"
            value={value}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            className={baseInputClasses}
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            placeholder={question.placeholder || ''}
            className={baseInputClasses}
          />
        );
    }
  };

  const getProgress = () => {
    const answered = Object.values(answers).filter(answer => 
      answer && answer.toString().trim() !== ''
    ).length;
    return Math.round((answered / questions.length) * 100);
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-300 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Additional Case Information</h2>
            <div className="text-sm text-gray-500">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
          
          <div className="text-sm text-gray-600">
            {getProgress()}% completed ({Object.values(answers).filter(a => a && a.toString().trim() !== '').length} of {questions.length} questions answered)
          </div>
        </div>

        {/* Question Form */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-300 p-8">
          <div className="mb-6">
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              {currentQuestion?.question}
              {currentQuestion?.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {renderQuestion(currentQuestion, currentQuestionIndex)}
            
            {errors[currentQuestionIndex] && (
              <p className="text-red-500 text-sm mt-2 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors[currentQuestionIndex]}
              </p>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-3">
              <button
                onClick={onBack}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
              >
                ← Back to Form
              </button>
              
              {currentQuestionIndex > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 font-medium"
                >
                  ← Previous
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit Case'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Navigator */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-300 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Question Navigator</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {questions.map((_, index) => {
              const isAnswered = answers[index] && answers[index].toString().trim() !== '';
              const isCurrent = index === currentQuestionIndex;
              const hasError = errors[index];
              
              return (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isCurrent
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                      : hasError
                      ? 'bg-red-100 text-red-600 border border-red-300'
                      : isAnswered
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                  } hover:shadow-md`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-center space-x-6 mt-4 text-sm text-gray-600">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded mr-2"></div>
              Current
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
              Answered
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></div>
              Error
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded mr-2"></div>
              Pending
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicQuestionForm;