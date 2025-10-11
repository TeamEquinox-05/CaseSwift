import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Cases from './components/Cases'
import LegalReferences from './components/LegalReferences'
import VictimForm from './components/VictimForm'
import DocumentUpload from './components/DocumentUpload'
import ConversationSidebar from './components/ConversationSidebar'

// Debug component to help diagnose login issues
function DebugInfo() {
  const { user, token, loading, isAuthenticated } = useAuth();
  
  useEffect(() => {
    console.log('Auth state:', {
      user,
      token,
      loading,
      isAuthenticated: isAuthenticated()
    });
  }, [user, token, loading, isAuthenticated]);
  
  return null; // This component doesn't render anything
}

function App() {
  return (
    <AuthProvider>
      <DebugInfo />
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const [activeView, setActiveView] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [resumeConversationData, setResumeConversationData] = useState(null)
  const { isAuthenticated, loading, user } = useAuth()
  
  useEffect(() => {
    console.log('AppContent rendered with:', { 
      isAuthenticated: isAuthenticated(), 
      loading, 
      user, 
      activeView 
    });
  }, [isAuthenticated, loading, user, activeView]);

  // Check URL parameters for direct access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    if (view === 'victim-form') {
      setActiveView('victim-form');
    }
  }, []);

  // Handle resume conversation from sidebar
  const handleResumeConversation = (conversationData) => {
    console.log('📞 Resuming conversation:', conversationData);
    setResumeConversationData(conversationData);
    setActiveView('dashboard'); // Navigate to dashboard which will show NewCaseForm with resume
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <ProtectedRoute requiredRoles={['admin', 'officer', 'investigator']}>
            <Dashboard resumeConversation={resumeConversationData} onClearResume={() => setResumeConversationData(null)} />
          </ProtectedRoute>
        )
      case 'cases':
        return (
          <ProtectedRoute requiredRoles={['admin', 'officer', 'investigator']}>
            <Cases />
          </ProtectedRoute>
        )
      case 'legal-references':
        return (
          <ProtectedRoute requiredRoles={['admin', 'officer', 'investigator']}>
            <LegalReferences />
          </ProtectedRoute>
        )
      case 'victim-form':
        return <VictimForm onNavigateBack={() => setActiveView('dashboard')} />
      case 'document-upload':
        return (
          <ProtectedRoute requiredRoles={['admin', 'officer', 'investigator']}>
            <DocumentUpload />
          </ProtectedRoute>
        )
      case 'settings':
        return (
          <ProtectedRoute requiredRole="admin">
            <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Settings</h1>
                <p className="text-gray-600">Application settings coming soon...</p>
              </div>
            </div>
          </ProtectedRoute>
        )
      default:
        return (
          <ProtectedRoute requiredRoles={['admin', 'officer', 'investigator']}>
            <Dashboard resumeConversation={resumeConversationData} onClearResume={() => setResumeConversationData(null)} />
          </ProtectedRoute>
        )
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Conversation Resume Sidebar - Show for authenticated users */}
      {isAuthenticated() && activeView !== 'victim-form' && (
        <ConversationSidebar onResumeConversation={handleResumeConversation} />
      )}

      {/* Hide sidebar for victim form OR if user is not authenticated */}
      {activeView !== 'victim-form' && isAuthenticated() && (
        <>
          {/* Mobile Glass Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 z-40 backdrop-blur-[2px] bg-white/10 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          {/* Sidebar */}
          <div className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
            <Sidebar 
              activeView={activeView} 
              setActiveView={setActiveView}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className={`${(activeView === 'victim-form' || !isAuthenticated()) ? 'w-full' : 'flex-1'} flex flex-col overflow-hidden`}>
        {/* Hide mobile header for victim form OR if user is not authenticated */}
        {activeView !== 'victim-form' && isAuthenticated() && (
          <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l-3-9" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-gray-900">
                  CaseSwift
                </h1>
              </div>
              <div className="w-10"></div> {/* Spacer for centering */}
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

export default App


