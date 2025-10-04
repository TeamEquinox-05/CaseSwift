import { useState, useEffect } from 'react'
import axios from 'axios'

// Import all forms
import FIRForm from '../forms/FIRForm'
import ChargeSheetForm from '../forms/ChargeSheetForm'
import VictimStatementForm from '../forms/VictimStatementForm'
import WitnessStatementForm from '../forms/WitnessStatementForm'
import ArrestMemoForm from '../forms/ArrestMemoForm'
import CaseDiaryForm from '../forms/CaseDiaryForm'
import SeizureMemoForm from '../forms/SeizureMemoForm'
import LetterToMagistrateForm from '../forms/LetterToMagistrateForm'
import LetterToMedicalOfficerForm from '../forms/LetterToMedicalOfficerForm'
import LetterToPoliceSurgeonForm from '../forms/LetterToPoliceSurgeonForm'

const FormFillingDashboard = ({ caseId, caseData, onBack }) => {
  const [selectedForm, setSelectedForm] = useState(null)
  const [completedForms, setCompletedForms] = useState({})
  const [formData, setFormData] = useState({})

  const forms = [
    {
      id: 'fir',
      name: 'FIR Form',
      component: FIRForm,
      description: 'First Information Report',
      category: 'Initial',
      icon: '📋'
    },
    {
      id: 'victim-statement',
      name: 'Victim Statement',
      component: VictimStatementForm,
      description: 'Statement of the victim',
      category: 'Statements',
      icon: '📝'
    },
    {
      id: 'witness-statement',
      name: 'Witness Statement',
      component: WitnessStatementForm,
      description: 'Statement of witnesses',
      category: 'Statements',
      icon: '👥'
    },
    {
      id: 'arrest-memo',
      name: 'Arrest Memo',
      component: ArrestMemoForm,
      description: 'Arrest memorandum',
      category: 'Investigation',
      icon: '🚔'
    },
    {
      id: 'case-diary',
      name: 'Case Diary',
      component: CaseDiaryForm,
      description: 'Daily case diary entries',
      category: 'Investigation',
      icon: '📖'
    },
    {
      id: 'seizure-memo',
      name: 'Seizure Memo',
      component: SeizureMemoForm,
      description: 'Property seizure memorandum',
      category: 'Investigation',
      icon: '📦'
    },
    {
      id: 'charge-sheet',
      name: 'Charge Sheet',
      component: ChargeSheetForm,
      description: 'Final charge sheet',
      category: 'Final',
      icon: '⚖️'
    },
    {
      id: 'letter-magistrate',
      name: 'Letter to Magistrate',
      component: LetterToMagistrateForm,
      description: 'Official letter to magistrate',
      category: 'Letters',
      icon: '✉️'
    },
    {
      id: 'letter-medical',
      name: 'Letter to Medical Officer',
      component: LetterToMedicalOfficerForm,
      description: 'Medical examination request',
      category: 'Letters',
      icon: '🏥'
    },
    {
      id: 'letter-surgeon',
      name: 'Letter to Police Surgeon',
      component: LetterToPoliceSurgeonForm,
      description: 'Police surgeon examination request',
      category: 'Letters',
      icon: '👨‍⚕️'
    }
  ]

  const categories = ['Initial', 'Statements', 'Investigation', 'Letters', 'Final']

  useEffect(() => {
    // Load any existing form completion status
    const savedStatus = localStorage.getItem(`caseSwift_formStatus_${caseId}`)
    if (savedStatus) {
      setCompletedForms(JSON.parse(savedStatus))
    }

    // Pre-populate form data from case data
    if (caseData) {
      setFormData(generateFormData(caseData))
    }
  }, [caseId, caseData])

  const generateFormData = (caseData) => {
    // Convert case data to form-ready format
    // This ensures forms are populated with ACTUAL case data, not hardcoded values
    return {
      // Basic case information from actual case
      caseId: caseData.caseId || 'UNKNOWN',
      caseTitle: caseData.caseTitle || '',
      caseDescription: caseData.caseDescription || '',
      
      // Victim information from actual case
      victimName: caseData.victimName || 'To be determined', // Actual victim name if available
      victimAge: caseData.victimAge || '',
      victimGender: caseData.victimGender || '',
      victimLocation: caseData.victimLocation || '',
      
      // Incident details from actual case
      incidentDate: caseData.incidentDate || '',
      incidentTime: caseData.incidentTime || '',
      incidentLocation: caseData.victimLocation || caseData.incidentLocation || '',
      
      // Case classification and legal details from AI analysis
      caseClassification: caseData.caseClassification || '',
      legalSections: caseData.legalReferences?.map(ref => ref.title).join(', ') || 
                      caseData.legalSections || '',
      
      // Investigation details from analysis
      investigationSteps: caseData.investigationSteps || {},
      requiredDocuments: caseData.requiredDocuments || [],
      
      // Auto-generated content from AI
      reportSummary: caseData.caseAnalysisReport || caseData.reportSummary || '',
      complianceScore: caseData.complianceScore || 0,
      riskAssessment: caseData.riskAssessment || 'Medium Risk',
      
      // Additional evidence from actual case
      evidenceFiles: caseData.evidenceFiles || [],
      previousCaseRef: caseData.previousCaseRef || '',
      
      // Officer/investigation details
      investigatingOfficer: caseData.investigatingOfficer || '',
      policeStation: caseData.policeStation || '',
      district: caseData.district || caseData.victimLocation?.split(',')[1]?.trim() || ''
    }
  }

  const handleFormComplete = (formId) => {
    const newCompletedForms = { ...completedForms, [formId]: true }
    setCompletedForms(newCompletedForms)
    localStorage.setItem(`caseSwift_formStatus_${caseId}`, JSON.stringify(newCompletedForms))
  }

  const getCompletionPercentage = () => {
    const totalForms = forms.length
    const completedCount = Object.values(completedForms).filter(Boolean).length
    return Math.round((completedCount / totalForms) * 100)
  }

  if (selectedForm) {
    const form = forms.find(f => f.id === selectedForm)
    const FormComponent = form.component
    
    return (
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => setSelectedForm(null)} 
              className="flex items-center text-gray-700 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{form.name}</h1>
            <div className="text-sm text-gray-600">
              Case: {caseId}
            </div>
          </div>
          
          <FormComponent 
            initialData={formData}
            onComplete={() => handleFormComplete(selectedForm)}
            caseData={caseData}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={onBack} 
            className="flex items-center text-gray-700 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Analysis
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">Form Filling Dashboard</h1>
            <p className="text-gray-600 mt-2">Case ID: {caseId}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Completion Progress</div>
            <div className="text-2xl font-bold text-blue-600">{getCompletionPercentage()}%</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Overall Progress</h2>
            <span className="text-sm text-gray-600">
              {Object.values(completedForms).filter(Boolean).length} of {forms.length} forms completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${getCompletionPercentage()}%` }}
            ></div>
          </div>
        </div>

        {/* Forms by Category */}
        {categories.map(category => {
          const categoryForms = forms.filter(form => form.category === category)
          const categoryCompleted = categoryForms.filter(form => completedForms[form.id]).length
          
          return (
            <div key={category} className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">{category} Documents</h2>
                <span className="text-sm text-gray-600">
                  {categoryCompleted}/{categoryForms.length} completed
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryForms.map(form => (
                  <div 
                    key={form.id}
                    className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 hover:shadow-md cursor-pointer ${
                      completedForms[form.id] 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedForm(form.id)}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-3xl">{form.icon}</div>
                        {completedForms[form.id] && (
                          <div className="text-green-500">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-gray-800 mb-2">{form.name}</h3>
                      <p className="text-gray-600 text-sm mb-4">{form.description}</p>
                      
                      <button className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                        completedForms[form.id]
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}>
                        {completedForms[form.id] ? 'Review Form' : 'Fill Form'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-8">
          <button className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors">
            Save Progress
          </button>
          <button 
            className={`px-6 py-3 rounded-lg transition-colors ${
              getCompletionPercentage() === 100
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={getCompletionPercentage() !== 100}
          >
            Complete Case Processing
          </button>
        </div>
      </div>
    </div>
  )
}

export default FormFillingDashboard