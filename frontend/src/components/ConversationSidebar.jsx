import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ConversationSidebar = ({ 
  onResumeConversation, 
  activeConversation, // { caseId, sessionId, caseData } when conversation is active
  onCloseConversation 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pausedConversations, setPausedConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Conversation state
  const [messages, setMessages] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [extractedData, setExtractedData] = useState({});
  const [progress, setProgress] = useState({
    caseInfo: 0,
    evidence: 0,
    compliance: 0,
    witnesses: 0
  });
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  
  const messagesEndRef = useRef(null);
  const NODE_API_URL = import.meta.env.VITE_NODE_API_URL || 'http://localhost:3001';
  const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

  // Auto-open sidebar when activeConversation is provided
  useEffect(() => {
    if (activeConversation) {
      console.log('🎯 Active conversation detected, opening sidebar:', activeConversation);
      setIsOpen(true);
      startConversation();
    } else {
      console.log('⏸️ No active conversation, showing paused list');
    }
  }, [activeConversation]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save conversation to MongoDB
  const saveConversationToMongoDB = async (updatedMessages, updatedExtractedData, updatedProgress) => {
    if (!activeConversation) return;
    
    try {
      await axios.post(`${NODE_API_URL}/api/conversation/save`, {
        caseId: activeConversation.caseId,
        sessionId: activeConversation.sessionId,
        conversationHistory: updatedMessages,
        extractedData: updatedExtractedData,
        progress: updatedProgress
      });
      console.log('💾 Conversation saved to MongoDB');
    } catch (error) {
      console.error('Error saving to MongoDB:', error);
    }
  };

  // Start conversation
  const startConversation = async () => {
    if (!activeConversation) return;

    const initialMessage = {
      role: 'ai',
      content: `Hello! I'll help you build a complete case file for **${activeConversation.caseData?.caseTitle || 'this case'}**.\n\nI'll ask you questions to gather all necessary information. The AI will adapt questions based on your answers.\n\nLet's start!`,
      timestamp: new Date().toISOString()
    };
    
    setMessages([initialMessage]);
    await getNextQuestion({ caseData: activeConversation.caseData });
  };

  // Get next AI question
  const getNextQuestion = async (context = {}) => {
    if (!activeConversation) return;

    setIsProcessing(true);
    setProcessingStatus('🤖 AI is analyzing...');

    try {
      // Build the message with case context for first message, or just user message for follow-ups
      let messageContent = context.userMessage || '';
      
      if (!context.userMessage && context.caseData) {
        // First message - include case details
        messageContent = `I need help building a case file. Here are the details:
Case ID: ${context.caseData.caseId}
Title: ${context.caseData.caseTitle}
Description: ${context.caseData.caseDescription}
Victim Age: ${context.caseData.victimAge}
Location: ${context.caseData.victimLocation}
Incident Date: ${context.caseData.incidentDate}

Please ask me questions to gather all necessary information for this case.`;
      }

      // Send request to ChatBot API in correct format
      const response = await axios.post(`${AI_API_URL}/api/chat`, {
        message: messageContent,
        session_id: activeConversation.sessionId
      });

      console.log('✅ AI Response:', response.data);

      // ChatBot returns { response: string, session_id: string }
      if (response.data && response.data.response) {
        const aiMessage = {
          role: 'ai',
          content: response.data.response,
          timestamp: new Date().toISOString()
        };

        const updatedMessages = [...messages, aiMessage];
        setMessages(updatedMessages);

        // Save to MongoDB
        await saveConversationToMongoDB(
          updatedMessages, 
          extractedData,
          progress
        );
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage = {
        role: 'ai',
        content: '⚠️ Sorry, I encountered an error. Please try again or skip this conversation.',
        timestamp: new Date().toISOString()
      };
      setMessages([...messages, errorMessage]);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Handle user send message
  const handleSendMessage = async () => {
    if (!currentAnswer.trim() || isProcessing) return;

    const userMessage = {
      role: 'user',
      content: currentAnswer,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setCurrentAnswer('');

    // Get next AI question
    await getNextQuestion({ userMessage: currentAnswer });
  };

  // Handle skip/pause conversation
  const handleSkipConversation = async () => {
    if (!activeConversation) return;

    try {
      await axios.post(`${NODE_API_URL}/api/conversation/pause`, {
        caseId: activeConversation.caseId,
        sessionId: activeConversation.sessionId
      });
      
      await saveConversationToMongoDB(messages, extractedData, progress);
      
      console.log('⏸️ Conversation paused');
      setShowSkipConfirm(false);
      
      if (onCloseConversation) {
        onCloseConversation();
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error pausing conversation:', error);
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Fetch paused conversations
  const fetchPausedConversations = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${NODE_API_URL}/api/conversation/paused-conversations`);
      if (response.data.success) {
        setPausedConversations(response.data.conversations);
      }
    } catch (error) {
      console.error('Error fetching paused conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on component mount and when sidebar opens (but NOT when active conversation exists)
  useEffect(() => {
    if (isOpen && !activeConversation) {
      console.log('📋 Fetching paused conversations...');
      fetchPausedConversations();
    }
  }, [isOpen, activeConversation]);

  // Auto-fetch every 30 seconds if sidebar is open AND no active conversation
  useEffect(() => {
    if (isOpen && !activeConversation) {
      const interval = setInterval(fetchPausedConversations, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, activeConversation]);

  const handleResumeClick = async (conversation) => {
    try {
      // Mark as resumed in backend
      await axios.post(`${NODE_API_URL}/api/conversation/resume`, {
        sessionId: conversation.sessionId
      });
      
      // Call parent callback to navigate to conversation
      if (onResumeConversation) {
        onResumeConversation(conversation);
      }
      
      // Close sidebar
      setIsOpen(false);
    } catch (error) {
      console.error('Error resuming conversation:', error);
      alert('Failed to resume conversation. Please try again.');
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStateColor = (state) => {
    if (state === 'active') return 'bg-green-100 text-green-800';
    if (state === 'paused') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <>
      {/* Toggle Button - Fixed Position */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-l-xl shadow-2xl hover:shadow-3xl transition-all duration-300 ${
          isOpen ? 'right-[500px]' : 'right-0'
        }`}
        title={activeConversation ? "Close Conversation" : "View Paused Conversations"}
      >
        <div className="relative">
          <svg 
            className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {!activeConversation && pausedConversations.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {pausedConversations.length}
            </span>
          )}
        </div>
      </button>

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[500px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-bold">
                {activeConversation ? '💬 Active Conversation' : '⏸️ Paused Conversations'}
              </h2>
              {activeConversation && (
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                  {activeConversation.caseData?.caseTitle || 'Case'}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Bar (when active conversation) */}
          {activeConversation && (
            <div className="mt-3">
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[
                  { label: 'Case Info', value: progress.caseInfo },
                  { label: 'Evidence', value: progress.evidence },
                  { label: 'Compliance', value: progress.compliance },
                  { label: 'Witnesses', value: progress.witnesses }
                ].map((item, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-white/70 mb-1">{item.label}</div>
                    <div className="bg-white/20 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-white h-full transition-all duration-300"
                        style={{ width: `${item.value}%` }}
                      ></div>
                    </div>
                    <div className="text-white font-semibold mt-1">{item.value}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeConversation ? (
            // ACTIVE CONVERSATION VIEW
            <>
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      {msg.role === 'ai' && (
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-2xl">🤖</span>
                          <span className="text-xs font-semibold text-gray-600">AI Assistant</span>
                          {msg.category && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              {msg.category}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className={`text-sm leading-relaxed ${msg.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                        {msg.content}
                      </div>
                      
                      {msg.legalBasis && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex items-start space-x-1 text-xs text-gray-600">
                            <span>📖</span>
                            <span className="italic">{msg.legalBasis}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm">{processingStatus || 'AI is thinking...'}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
                {isComplete ? (
                  <div className="text-center">
                    <div className="text-green-600 font-semibold mb-2">✅ Conversation Complete!</div>
                    <button
                      onClick={() => {
                        if (onCloseConversation) onCloseConversation();
                        setIsOpen(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Close & View Case
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex space-x-2 mb-2">
                      <textarea
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your answer here... (Press Enter to send)"
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows="3"
                        disabled={isProcessing}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={isProcessing || !currentAnswer.trim()}
                        className="px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>💡 Tip: Be specific for better case documentation</span>
                      <button
                        onClick={() => setShowSkipConfirm(true)}
                        disabled={isProcessing}
                        className="text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
                      >
                        ⏸️ Pause & Save
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            // PAUSED CONVERSATIONS LIST VIEW
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : pausedConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-center">No paused conversations</p>
                  <p className="text-xs text-center mt-2">Start a new case to begin</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pausedConversations.map((conv) => (
                    <div
                      key={conv.sessionId}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleResumeClick(conv)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm mb-1">
                            {conv.caseTitle}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">{conv.caseId}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStateColor(conv.conversationState)}`}>
                              {conv.conversationState}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTimeAgo(conv.lastActiveAt)}
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600">Overall Progress</span>
                          <span className="font-semibold text-gray-900">{conv.overallProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${getProgressColor(conv.overallProgress)}`}
                            style={{ width: `${conv.overallProgress}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center text-xs text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {conv.messageCount} messages
                        </div>
                        <button
                          className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResumeClick(conv);
                          }}
                        >
                          Resume →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Only show refresh when not in active conversation */}
        {!activeConversation && (
          <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 p-4">
            <button
              onClick={fetchPausedConversations}
              className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center justify-center space-x-2"
              disabled={isLoading}
            >
              <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        )}
      </div>

      {/* Skip Confirmation Modal */}
      {showSkipConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">⏸️ Pause Conversation?</h3>
            <p className="text-gray-600 mb-6">
              Your progress will be saved and you can resume this conversation later from the sidebar.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleSkipConversation}
                className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Yes, Pause & Save
              </button>
              <button
                onClick={() => setShowSkipConfirm(false)}
                className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
};

export default ConversationSidebar;
