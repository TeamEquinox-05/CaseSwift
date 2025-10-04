import { useState, useEffect } from 'react'
import { FormAutoFill } from '../utils/FormAutoFill'
import ChatModal from './ChatModal'

const CaseAnalysisWithForms = ({ analysisData, originalCaseData, sessionId, caseId, onBack, legalProcessSteps, stepsResponse, onContinueToForms }) => {
  const [recommendedForms, setRecommendedForms] = useState([])
  const [showChat, setShowChat] = useState(false)
  const [autoFilledForms, setAutoFilledForms] = useState({})

  useEffect(() => {
    if (analysisData) {
      const parsedData = FormAutoFill.parseServerResponse(analysisData)
      if (parsedData) {
        const forms = FormAutoFill.getRecommendedForms(parsedData)
        setRecommendedForms(forms)

        // Pre-populate forms with available data
        const filledForms = {
          ChargeSheetForm: FormAutoFill.populateChargeSheetForm(parsedData),
          FIRForm: FormAutoFill.populateFIRForm(parsedData, originalCaseData),
          VictimStatementForm: FormAutoFill.populateVictimStatementForm(parsedData, originalCaseData)
        }
        setAutoFilledForms(filledForms)
      }
    }
  }, [analysisData, originalCaseData])

  const handleDownloadForm = (formType) => {
    const formData = autoFilledForms[formType]
    if (formData) {
      // Create downloadable JSON file
      const dataStr = JSON.stringify(formData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${formType}_${caseId}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  const handleOpenForm = (formType) => {
    // Store the auto-filled data in localStorage for the form to use
    const formData = autoFilledForms[formType]
    if (formData) {
      localStorage.setItem(`caseSwift_${formType}_data`, JSON.stringify(formData))
      // In a real app, you would navigate to the form component
      alert(`${formType} data has been prepared. The form would open with pre-filled data.`)
    }
  }

  const getAnalysisSteps = () => {
    try {
      const parsedData = FormAutoFill.parseServerResponse(analysisData)
      if (!parsedData) return []

      const steps = []

      // Step 1: FIR Registration
      steps.push({
        title: "File FIR (First Information Report)",
        description: "Register the case with police authorities",
        status: "required",
        forms: ["FIRForm"],
        timeline: "Immediate"
      })

      // Step 2: Investigation phase
      steps.push({
        title: "Investigation Phase",
        description: "Police investigation and evidence collection",
        status: "pending",
        forms: ["VictimStatementForm", "WitnessStatementForm"],
        timeline: "30-60 days"
      })

      // Step 3: Charge sheet if required
      if (parsedData.reportSummary?.type_of_final_report === 'Chargesheet') {
        steps.push({
          title: "File Charge Sheet",
          description: "Submit final investigation report to court",
          status: "pending",
          forms: ["ChargeSheetForm"],
          timeline: "After investigation"
        })
      }

      // Step 4: Court proceedings
      steps.push({
        title: "Court Proceedings",
        description: "Trial and legal proceedings",
        status: "future",
        forms: [],
        timeline: "6 months - 2 years"
      })

      return steps
    } catch (error) {
      console.error('Error getting analysis steps:', error)
      return []
    }
  }

  const parseLegalProcessSteps = (stepsData) => {
    if (!stepsData) return []
    
    try {
      // If stepsData is already an array of step objects, return as-is
      if (Array.isArray(stepsData)) {
        return stepsData.map(step => ({
          step_id: step.step_id,
          title: step.title || step.task,
          description: step.description || '',
          status: step.status || (step.completed ? 'completed' : 'pending'),
          timeline: step.timeline || step.deadline || 'As needed',
          category: step.category || 'PROCEDURAL',
          priority: step.priority,
          legal_basis: step.legal_basis
        }))
      }

      // Legacy handling for string responses (old format)
      let content = stepsData
      
      if (typeof stepsData === 'object' && stepsData !== null) {
        content = stepsData.response || stepsData.content || JSON.stringify(stepsData)
      } else if (typeof stepsData === 'string') {
        content = stepsData
      } else {
        content = String(stepsData)
      }
      
      if (typeof content !== 'string') {
        content = JSON.stringify(content)
      }
      
      // Split by numbered points and clean up
      const stepLines = content.split(/\d+\.\s/).filter(line => line.trim())
      
      return stepLines.map((step, index) => {
        const cleanStep = step.trim().replace(/^\*\*|\*\*$/g, '').replace(/\*\*/g, '')
        const [title, ...descParts] = cleanStep.split(':')
        
        return {
          step_id: index + 1,
          title: title.trim(),
          description: descParts.join(':').trim() || cleanStep,
          status: index === 0 ? 'required' : 'pending',
          timeline: 'As needed',
          category: 'PROCEDURAL'
        }
      })
    } catch (error) {
      console.error('Error parsing legal process steps:', error)
      return []
    }
  }

  const analysisSteps = getAnalysisSteps()
  const legalSteps = parseLegalProcessSteps(legalProcessSteps)
  
  // Debug logging
  console.log('Legal Process Steps Data:', legalProcessSteps)
  console.log('Parsed Legal Steps:', legalSteps)

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={onBack} 
            className="flex items-center text-gray-700 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-xl font-bold text-gray-800">Case Analysis & Forms</h1>
          <div className="flex items-center space-x-4">
            {/* Chat Icon */}
            <button
              onClick={() => setShowChat(true)}
              className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
              title="Chat with Case Assistant"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Chat Modal */}
        <ChatModal 
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          sessionId={sessionId}
          caseId={caseId}
        />

        {/* Case Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Case: {caseId}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">Session ID</h3>
              <p className="text-blue-600 font-mono text-sm">{sessionId}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">Status</h3>
              <p className="text-green-600">Analysis Complete</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-800">Investigation Steps</h3>
              <p className="text-yellow-600">
                {(legalSteps.length > 0 ? legalSteps : analysisSteps).length} steps identified
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                {(legalSteps.length > 0 ? legalSteps : analysisSteps).filter(s => s.status === 'required').length} urgent
              </p>
            </div>
          </div>
        </div>

        {/* Analysis Steps */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            {legalProcessSteps ? 'AI-Generated Investigation Checklist' : 'Investigation Steps'}
          </h2>
          <div className="space-y-4">
            {(legalSteps.length > 0 ? legalSteps : analysisSteps).map((step, index) => {
              const statusColors = {
                required: 'border-red-500 bg-red-50',
                pending: 'border-yellow-500 bg-yellow-50',
                completed: 'border-green-500 bg-green-50',
                future: 'border-gray-500 bg-gray-50'
              }
              
              const statusBadgeColors = {
                required: 'bg-red-100 text-red-800',
                pending: 'bg-yellow-100 text-yellow-800',
                completed: 'bg-green-100 text-green-800',
                future: 'bg-gray-100 text-gray-800'
              }
              
              const categoryIcons = {
                MANDATORY: '⚠️',
                EVIDENCE: '📋',
                PROCEDURAL: '📝',
                FINAL: '⚖️'
              }

              return (
                <div key={index} className={`border-l-4 pl-4 py-3 rounded-r ${statusColors[step.status] || 'border-blue-500 bg-blue-50'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {step.category && categoryIcons[step.category] && (
                          <span className="text-lg">{categoryIcons[step.category]}</span>
                        )}
                        <h3 className="font-semibold text-gray-800">
                          {step.step_id && <span className="text-gray-500 mr-2">#{step.step_id}</span>}
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-gray-700 text-sm mb-1">{step.description}</p>
                      <div className="flex items-center gap-4 text-xs mt-2">
                        <span className="text-blue-600 font-medium">
                          ⏱️ {step.timeline}
                        </span>
                        {step.priority && (
                          <span className={`px-2 py-1 rounded ${
                            step.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                            step.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {step.priority} Priority
                          </span>
                        )}
                        {step.category && (
                          <span className="text-gray-600">
                            {step.category}
                          </span>
                        )}
                      </div>
                      {step.legal_basis && (
                        <p className="text-gray-500 text-xs mt-2 italic">
                          📖 Legal Basis: {step.legal_basis}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-4 ${
                      statusBadgeColors[step.status] || 'bg-blue-100 text-blue-800'
                    }`}>
                      {step.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Helpful Note */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Need More Guidance?</h4>
                <p className="text-sm text-blue-800">
                  Use the <strong>Chat Assistant</strong> (blue button in top-right) to ask specific questions about:
                </p>
                <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
                  <li>How to execute each step</li>
                  <li>Required documents for evidence</li>
                  <li>Legal procedures and timelines</li>
                  <li>Case-specific compliance requirements</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Continue to Forms Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Ready to Process Forms?</h2>
            <p className="text-gray-600 mb-6">
              Continue to the form filling dashboard to complete all required legal documents for this case. 
              All forms will be pre-populated with the case analysis data.
            </p>
            <button
              onClick={onContinueToForms}
              className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Continue to Form Filling Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CaseAnalysisWithForms