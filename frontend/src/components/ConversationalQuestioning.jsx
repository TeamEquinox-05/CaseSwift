import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ConversationalQuestioning = ({ caseId, sessionId, caseData, onComplete, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(''); // NEW: Show what AI is doing
  const [isComplete, setIsComplete] = useState(false);
  const [extractedData, setExtractedData] = useState({});
  const [progress, setProgress] = useState({
    caseInfo: 0,
    evidence: 0,
    compliance: 0,
    witnesses: 0
  });
  const messagesEndRef = useRef(null);
  const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';
  const NODE_API_URL = import.meta.env.VITE_NODE_API_URL || 'http://localhost:3001';

  // Save conversation to MongoDB
  const saveConversationToMongoDB = async (updatedMessages, updatedExtractedData, updatedProgress) => {
    try {
      await axios.post(`${NODE_API_URL}/api/conversation/save`, {
        caseId,
        sessionId,
        conversationHistory: updatedMessages,
        extractedData: updatedExtractedData,
        progress: updatedProgress
      });
      console.log('💾 Conversation saved to MongoDB');
    } catch (error) {
      console.error('Error saving to MongoDB:', error);
      // Don't block the flow if save fails
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Start conversation
    startConversation();
  }, []);

  const startConversation = async () => {
    const initialMessage = {
      role: 'ai',
      content: `Hello! I'll help you build a complete case file for **${caseData.caseTitle || 'this case'}**.\n\nI'll ask you some questions to gather all necessary information. The AI will adapt questions based on your answers to ensure we don't miss anything critical.\n\nLet's start: **${getFirstQuestion()}**`,
      timestamp: new Date().toISOString()
    };
    
    setMessages([initialMessage]);
    
    // Get first AI-generated question
    await getNextQuestion({ caseData });
  };

  const getFirstQuestion = () => {
    const isPOCSO = caseData.victimAge && parseInt(caseData.victimAge) < 18;
    if (isPOCSO) {
      return "This appears to be a POCSO case (victim under 18). Let's ensure all mandatory procedures are followed.";
    }
    return "Let's gather the complete details systematically.";
  };

  const getNextQuestion = async (context) => {
    setIsProcessing(true);
    try {
      const response = await axios.post(`${AI_API_URL}/api/conversational-question`, {
        case_id: caseId,
        session_id: sessionId,
        case_data: context.caseData || caseData,
        conversation_history: messages,
        extracted_data: extractedData
      });

      if (response.data.complete) {
        // Conversation complete
        setIsComplete(true);
        setProcessingStatus(''); // Clear status
        const completeMessage = {
          role: 'ai',
          content: `✅ **Case information gathering complete!**\n\nI have all the necessary information. Here's what we've covered:\n\n${response.data.summary}\n\nProceeding to generate your investigation checklist and documents...`,
          timestamp: new Date().toISOString(),
          isComplete: true
        };
        setMessages(prev => [...prev, completeMessage]);
        
        // Call completion handler after delay
        setTimeout(() => {
          onComplete({
            extractedData: response.data.final_data,
            conversationHistory: messages
          });
        }, 2000);
      } else {
        // Add AI question
        setProcessingStatus(''); // Clear status before showing question
        const aiMessage = {
          role: 'ai',
          content: response.data.question,
          questionType: response.data.question_type,
          category: response.data.category,
          legalBasis: response.data.legal_basis,
          timestamp: new Date().toISOString(),
          isUrgent: response.data.is_urgent
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Update progress
        if (response.data.progress) {
          setProgress(response.data.progress);
        }
      }
    } catch (error) {
      console.error('Error getting next question:', error);
      const errorMessage = {
        role: 'system',
        content: 'Error getting next question. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || isProcessing) return;

    // Add user message
    const userMessage = {
      role: 'user',
      content: currentAnswer,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    const answerText = currentAnswer;
    setCurrentAnswer('');
    setIsProcessing(true);

    try {
      // Get the last AI question from messages
      const lastAiMessage = [...messages].reverse().find(m => m.role === 'ai' && !m.isComplete);
      const lastQuestion = lastAiMessage ? lastAiMessage.content : "Previous question";

      // ⚡ Step 1: Analyze answer
      setProcessingStatus('🤖 Analyzing your answer...');
      const response = await axios.post(`${AI_API_URL}/api/process-answer`, {
        case_id: caseId,
        session_id: sessionId,
        question: lastQuestion,
        answer: answerText,
        case_data: caseData,
        conversation_history: messages,
        extracted_data: extractedData
      });

      // Update extracted data with SMART MERGING
      if (response.data.extracted_data) {
        console.log('🔍 [DEBUG] Extracted data from backend:', response.data.extracted_data);
        console.log('🔍 [DEBUG] Current extractedData state:', extractedData);
        
        // Smart merge function - appends text, merges arrays, keeps first value for names
        const smartMerge = (oldData, newData) => {
          const merged = { ...oldData };
          
          // Fields that should APPEND (accumulate information)
          const appendFields = ['incident_description', 'location', 'accused_description', 'victim_description'];
          
          // Fields that should MERGE arrays
          const arrayFields = ['evidence_items', 'witnesses', 'procedures_completed', 'procedures_pending'];
          
          // Fields that should keep FIRST value (don't overwrite with new mentions)
          const keepFirstFields = ['victim_name', 'accused_name', 'victim_age', 'accused_age', 'victim_gender', 'accused_gender'];
          
          Object.keys(newData).forEach(key => {
            const newValue = newData[key];
            const oldValue = merged[key];
            
            // Skip null/undefined/empty values
            if (!newValue || newValue === 'null' || newValue === '' || 
                (Array.isArray(newValue) && newValue.length === 0)) {
              return;
            }
            
            // Append to text fields (accumulate descriptions)
            if (appendFields.includes(key)) {
              if (oldValue && oldValue !== 'null' && oldValue !== '') {
                // Only append if new info is different
                if (!oldValue.includes(newValue)) {
                  merged[key] = `${oldValue}. ${newValue}`;
                }
              } else {
                merged[key] = newValue;
              }
            }
            // Merge arrays (combine evidence, witnesses, etc.)
            else if (arrayFields.includes(key)) {
              if (Array.isArray(newValue)) {
                const oldArray = Array.isArray(oldValue) ? oldValue : [];
                // Add only unique items
                const uniqueItems = newValue.filter(item => !oldArray.includes(item));
                merged[key] = [...oldArray, ...uniqueItems];
              }
            }
            // Keep first value for identity fields (don't overwrite name with new mention)
            else if (keepFirstFields.includes(key)) {
              if (!oldValue || oldValue === 'null' || oldValue === '') {
                merged[key] = newValue;
              }
              // else keep old value
            }
            // For other fields, new value overwrites
            else {
              merged[key] = newValue;
            }
          });
          
          return merged;
        };
        
        const updatedExtractedData = smartMerge(extractedData, response.data.extracted_data);
        
        console.log('🔍 [DEBUG] Smart-merged extractedData:', updatedExtractedData);
        setExtractedData(updatedExtractedData);
        
        // Save to MongoDB after extracting data
        const updatedMessages = [...messages, userMessage];
        await saveConversationToMongoDB(updatedMessages, updatedExtractedData, progress);
      }

      // Show quality assessment or clarification message
      if (response.data.needs_clarification) {
        const clarificationMessage = {
          role: 'ai',
          content: `⚠️ ${response.data.clarification_reason || 'Could you please provide more specific details?'}`,
          timestamp: new Date().toISOString(),
          isAnalysis: true
        };
        setMessages(prev => [...prev, clarificationMessage]);
        
        // ⚠️ IMPORTANT: If clarification is needed, DON'T get next question yet
        // Wait for officer to provide clarification first
        setIsProcessing(false);
        setProcessingStatus('');
        return; // Exit early - don't call getNextQuestion()
      } else if (response.data.quality_assessment) {
        const analysisMessage = {
          role: 'ai',
          content: `✓ ${response.data.quality_assessment}`,
          timestamp: new Date().toISOString(),
          isAnalysis: true
        };
        setMessages(prev => [...prev, analysisMessage]);
      }

      // Show compliance alerts if any
      if (response.data.compliance_alerts && response.data.compliance_alerts.length > 0) {
        const alertMessage = {
          role: 'system',
          content: `🔔 Compliance Alert: ${response.data.compliance_alerts.join(', ')}`,
          timestamp: new Date().toISOString(),
          isUrgent: true
        };
        setMessages(prev => [...prev, alertMessage]);
      }

      // ⚡ Step 2: Get next question (only if no clarification needed)
      setProcessingStatus('💭 Generating next question...');
      await getNextQuestion({
        caseData: { ...caseData, ...extractedData }
      });
    } catch (error) {
      console.error('Error processing answer:', error);
      const errorMessage = {
        role: 'system',
        content: 'Error processing your answer. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsProcessing(false);
      setProcessingStatus(''); // Clear status on error
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  const getProgressColor = (value) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">AI Case Investigation Assistant</h2>
              <p className="text-sm text-gray-600 mt-1">
                Case ID: {caseId} | Session: {sessionId?.substring(0, 8)}...
              </p>
            </div>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Back
            </button>
          </div>

          {/* Progress Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Case Info', value: progress.caseInfo },
              { label: 'Evidence', value: progress.evidence },
              { label: 'Compliance', value: progress.compliance },
              { label: 'Witnesses', value: progress.witnesses }
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="text-xs text-gray-600 mb-2">{item.label}</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(item.value)}`}
                    style={{ width: `${item.value}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{item.value}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Messages */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : message.role === 'system'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.role === 'ai' && (
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-2">🤖</span>
                      <span className="font-semibold">AI Assistant</span>
                      {message.isUrgent && (
                        <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                          URGENT
                        </span>
                      )}
                    </div>
                  )}
                  {message.role === 'user' && (
                    <div className="flex items-center justify-end mb-2">
                      <span className="font-semibold">You</span>
                      <span className="text-2xl ml-2">👮</span>
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none">
                    {(message.content || '').split('\n').map((line, i) => (
                      <p key={i} className={message.role === 'user' ? 'text-white' : ''}>
                        {line}
                      </p>
                    ))}
                  </div>
                  {message.legalBasis && (
                    <div className="mt-2 pt-2 border-t border-gray-300 text-xs text-gray-600">
                      📖 Legal Basis: {message.legalBasis}
                    </div>
                  )}
                  {message.category && (
                    <div className="mt-1 text-xs text-gray-500">
                      Category: {message.category}
                    </div>
                  )}
                  <div className="text-xs opacity-60 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    <span className="text-sm text-gray-600 ml-2">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {!isComplete && (
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              {/* ⚡ Processing Status Indicator */}
              {processingStatus && (
                <div className="mb-4 flex items-center justify-center space-x-2 text-blue-600 bg-blue-50 py-2 px-4 rounded-lg animate-pulse">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="font-medium">{processingStatus}</span>
                </div>
              )}
              
              <div className="flex space-x-4">
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your answer here... (Press Enter to send, Shift+Enter for new line)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="2"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!currentAnswer.trim() || isProcessing}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Send'
                  )}
                </button>
              </div>
              <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
                <span>💡 Tip: Be specific and detailed in your answers for better case documentation</span>
                <span>{currentAnswer.length} characters</span>
              </div>
            </div>
          )}
        </div>

        {/* Extracted Data Preview */}
        {Object.keys(extractedData).length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              📊 Information Gathered So Far
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(extractedData).map(([key, value]) => {
                // Format the value for display
                let displayValue;
                if (Array.isArray(value)) {
                  displayValue = value.length > 0 ? value.join(', ') : '(not provided yet)';
                } else if (value === null || value === 'null' || value === '') {
                  displayValue = '(not provided yet)';
                } else {
                  displayValue = String(value);
                }
                
                return (
                  <div key={key} className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">
                      {key.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div className="text-sm font-medium text-gray-800">
                      {displayValue}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationalQuestioning;
