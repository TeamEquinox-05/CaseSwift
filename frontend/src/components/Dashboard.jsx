import { useState, useEffect } from 'react'
import axios from 'axios'
import NewCaseForm from './NewCaseForm'
import ExistingCaseUpload from './ExistingCaseUpload'
import CaseAnalysisReport from './CaseAnalysisReport'

const Dashboard = ({ resumeConversation, onClearResume }) => {
  const [selectedOption, setSelectedOption] = useState(null)
  const [caseAnalysis, setCaseAnalysis] = useState(null)
  const [caseId, setCaseId] = useState(null)
  const [showAnalysisReport, setShowAnalysisReport] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch case analysis data from backend every time Dashboard loads
  useEffect(() => {
    // Check if there's a case ID in localStorage to fetch
    const savedCaseId = localStorage.getItem('caseSwift_caseId')
    
    if (savedCaseId) {
      fetchCaseAnalysis(savedCaseId)
    }
  }, [])
  
  // Function to fetch case analysis data from backend
  const fetchCaseAnalysis = async (id) => {
    setIsLoading(true)
    try {
      const response = await axios.post('http://localhost:3001/api/case', { caseId: id })
      
      if (response.data.success) {
        console.log('Fetched fresh case analysis data from backend')
        setCaseAnalysis(response.data.analysis)
        setCaseId(id)
        setShowAnalysisReport(true)
      } else {
        console.error('Error fetching case analysis:', response.data.error)
      }
    } catch (error) {
      console.error('Failed to fetch case analysis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetToHome = () => {
    setSelectedOption(null)
    setShowAnalysisReport(false)
    // Clear case data from localStorage when explicitly returning to home
    localStorage.removeItem('caseSwift_caseAnalysis')
    localStorage.removeItem('caseSwift_caseId')
  }

  if (selectedOption === 'new-case') {
    return <NewCaseForm onBack={resetToHome} resumeConversation={resumeConversation} onClearResume={onClearResume} />
  }

  if (selectedOption === 'existing-case') {
    return <ExistingCaseUpload onBack={resetToHome} />
  }

  // Auto-navigate to new case form if resuming conversation
  if (resumeConversation && !selectedOption) {
    return <NewCaseForm onBack={resetToHome} resumeConversation={resumeConversation} onClearResume={onClearResume} />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading case analysis...</p>
        </div>
      </div>
    )
  }
  
  if (showAnalysisReport && caseAnalysis) {
    return <CaseAnalysisReport analysisData={caseAnalysis} caseId={caseId} onBack={resetToHome} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <div className="text-center">
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mr-3 shadow-lg">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l-3-9" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  CaseSwift
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
        {/* Main Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto mb-8 lg:mb-16">
          {/* New Case Option */}
        <div 
          onClick={() => setSelectedOption('new-case')}
          className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-opacity-50 transform hover:-translate-y-1"
        >
          <div className="p-6 lg:p-8 text-center">
            <div className="w-20 h-20 lg:w-24 lg:h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6 group-hover:bg-blue-200 transition-colors duration-300">
              <svg className="w-10 h-10 lg:w-12 lg:h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-navy-900 mb-2 lg:mb-3">New Case</h3>
            <p className="text-sm lg:text-base text-gray-600 mb-4 lg:mb-6">Start a new legal case with comprehensive form filling and documentation</p>
            <div className="flex items-center justify-center space-x-2 text-blue-600 font-medium text-sm lg:text-base">
              <span>Create New Case</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Existing Case Option */}
        <div 
          onClick={() => setSelectedOption('existing-case')}
          className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-green-500 hover:ring-opacity-50 transform hover:-translate-y-1"
        >
          <div className="p-6 lg:p-8 text-center">
            <div className="w-20 h-20 lg:w-24 lg:h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6 group-hover:bg-green-200 transition-colors duration-300">
              <svg className="w-10 h-10 lg:w-12 lg:h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7m0 0V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v2M7 13l3 3 7-7" />
              </svg>
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-navy-900 mb-2 lg:mb-3">Existing Case</h3>
            <p className="text-sm lg:text-base text-gray-600 mb-4 lg:mb-6">Upload and analyze existing case documents with AI-powered insights</p>
            <div className="flex items-center justify-center space-x-2 text-green-600 font-medium text-sm lg:text-base">
              <span>Upload Case File</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 lg:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-white rounded-lg p-4 lg:p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm font-medium text-gray-600">Total Cases</p>
              <p className="text-xl lg:text-2xl font-bold text-navy-900">127</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-blue-600 font-bold text-lg lg:text-xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 lg:p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-xl lg:text-2xl font-bold text-yellow-600">23</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-yellow-100 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-yellow-600 font-bold text-lg lg:text-xl">⏱️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 lg:p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm font-medium text-gray-600">Compliance Rate</p>
              <p className="text-xl lg:text-2xl font-bold text-green-600">85%</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-green-600 font-bold text-lg lg:text-xl">✅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ongoing Cases Table */}
      <div className="mt-8 lg:mt-16">
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
          <div className="px-4 py-3 lg:px-6 lg:py-4 bg-gradient-to-r from-gray-50 to-blue-50">
            <h2 className="text-lg lg:text-xl font-bold text-navy-900">Ongoing Cases</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case ID</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Victim Code</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offence Type</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Progress</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Pending Tasks</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Updated</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                    <span className="text-xs lg:text-sm font-medium text-blue-600 hover:underline cursor-pointer">FIR001/2025</span>
                  </td>
                  <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900 hidden sm:table-cell">V-2025-001</td>
                  <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">POCSO Act</td>
                  <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    <div className="flex items-center">
                      <div className="w-12 lg:w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                      <span className="text-xs lg:text-sm text-gray-900">75%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Court documents pending</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2 hours ago</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">FIR002/2025</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">V-2025-002</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">IPC Sec 376</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                      <span className="text-sm text-gray-900">45%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Medical exam report</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1 day ago</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">FIR003/2025</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">V-2025-003</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">POCSO Act Sec 5/6</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                      </div>
                      <span className="text-sm text-gray-900">90%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Final report review</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">3 hours ago</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default Dashboard