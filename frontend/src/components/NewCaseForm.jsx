import { useState } from 'react'
import axios from 'axios'
import CaseAnalysisWithForms from './CaseAnalysisWithForms'
import ChatModal from './ChatModal'
import FormFillingDashboard from './FormFillingDashboard'
import DynamicQuestionForm from './DynamicQuestionForm'
import ConversationalQuestioning from './ConversationalQuestioning'

const NewCaseForm = ({ onBack }) => {
  const [formData, setFormData] = useState({
    caseId: '',
    caseTitle: '',
    caseDescription: '',
    victimAge: '',
    victimGender: '',
    victimLocation: '',
    incidentDate: '',
    incidentTime: '',
    evidenceFiles: [],
    previousCaseRef: '',
    previousCasePdf: null
  })

  const [currentSection, setCurrentSection] = useState(0)
  const [currentCaseId, setCurrentCaseId] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [analysisData, setAnalysisData] = useState(null)
  const [showAnalysisReport, setShowAnalysisReport] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [stepsResponse, setStepsResponse] = useState(null)
  const [legalProcessSteps, setLegalProcessSteps] = useState(null)
  const [showFormDashboard, setShowFormDashboard] = useState(false)
  const [showDynamicQuestions, setShowDynamicQuestions] = useState(false)
  const [showConversationalQA, setShowConversationalQA] = useState(false)
  const [dynamicQuestions, setDynamicQuestions] = useState([])
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [useConversationalMode] = useState(true) // Toggle: true = conversational, false = form-based

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = (e) => {
    if (e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      setFormData(prev => ({
        ...prev,
        evidenceFiles: [...prev.evidenceFiles, ...files]
      }))
    }
  }

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      evidenceFiles: prev.evidenceFiles.filter((_, i) => i !== index)
    }))
  }

  // Function to automatically request investigation steps
  const requestInvestigationSteps = async (sessionId, caseType) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      // Determine the appropriate question based on case type
      let stepsQuestion = '';
      if (caseType.toLowerCase().includes('rape') || caseType.toLowerCase().includes('sexual')) {
        if (formData.victimAge && parseInt(formData.victimAge) < 18) {
          stepsQuestion = 'What evidence should be collected for under age rape case? What steps should the investigating officer take?';
        } else {
          stepsQuestion = 'What evidence should be collected for rape case? What steps should the investigating officer take?';
        }
      } else {
        stepsQuestion = 'What are the mandatory investigation steps and evidence collection procedures for this case?';
      }
      
      const stepsResponse = await axios.post(`${apiBaseUrl}/api/chat`, {
        message: stepsQuestion,
        session_id: sessionId
      });
      
      if (stepsResponse.data && stepsResponse.data.response) {
        setStepsResponse({
          question: stepsQuestion,
          response: stepsResponse.data.response
        });
      }
    } catch (error) {
      console.error('Error requesting investigation steps:', error);
    }
  }

  // Function to generate investigation checklist from AI API
  const requestLegalProcessSteps = async (sessionId, caseType) => {
    try {
      const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';
      
      // Call the checklist generator endpoint
      const checklistResponse = await axios.post(`${AI_API_URL}/api/generate-checklist`, {
        case_id: formData.caseId || 'NEW_CASE',
        case_type: caseType,
        victim_age: formData.victimAge || '',
        incident_details: formData.caseDescription || '',
        current_status: 'Initial Registration'
      });
      
      if (checklistResponse.data && checklistResponse.data.checklist) {
        // Convert checklist items to a format the component expects
        return checklistResponse.data.checklist.map((item, index) => ({
          step_id: item.step_id || index + 1,
          title: item.task,
          description: `${item.legal_basis ? item.legal_basis + ' - ' : ''}Priority: ${item.priority}`,
          timeline: item.deadline,
          status: item.completed ? 'completed' : (item.priority === 'HIGH' ? 'required' : 'pending'),
          category: item.category
        }));
      }
      return null;
    } catch (error) {
      console.error('Error requesting legal process steps:', error);
      // Fallback: Return default steps for the case type
      return generateDefaultSteps(caseType);
    }
  }

  // Generate default investigation steps based on case type
  const generateDefaultSteps = (caseType) => {
    const isPOCSO = caseType?.toLowerCase().includes('minor') || 
                    caseType?.toLowerCase().includes('child') ||
                    (formData.victimAge && parseInt(formData.victimAge) < 18);
    
    const baseSteps = [
      {
        step_id: 1,
        title: "Register FIR Immediately",
        description: "CrPC Section 154 - First Information Report must be registered without delay",
        timeline: "Immediate (within 24 hours)",
        status: "required",
        category: "MANDATORY"
      },
      {
        step_id: 2,
        title: "Conduct Medical Examination",
        description: isPOCSO 
          ? "POCSO Act Section 27 - Medical examination by female doctor within 24 hours"
          : "CrPC Section 164A - Medical examination within 72 hours",
        timeline: isPOCSO ? "Within 24 hours" : "Within 72 hours",
        status: "required",
        category: "MANDATORY"
      },
      {
        step_id: 3,
        title: "Record Victim's Statement",
        description: isPOCSO
          ? "POCSO Act Section 24 - Statement recorded at victim's residence or place of choice, by woman police officer"
          : "CrPC Section 161 - Record detailed statement of victim",
        timeline: "Within 48 hours",
        status: "pending",
        category: "MANDATORY"
      }
    ];

    if (isPOCSO) {
      baseSteps.push(
        {
          step_id: 4,
          title: "Age Determination",
          description: "POCSO Act Section 34 - Obtain birth certificate, school records, or ossification test",
          timeline: "Before charge sheet filing",
          status: "pending",
          category: "MANDATORY"
        },
        {
          step_id: 5,
          title: "Notify Child Welfare Committee",
          description: "POCSO Act Section 19 - Inform CWC and arrange support services",
          timeline: "Within 24 hours",
          status: "pending",
          category: "MANDATORY"
        },
        {
          step_id: 6,
          title: "Arrange NGO Support",
          description: "POCSO Act Section 33 - Connect victim with support organization for counseling",
          timeline: "Within 72 hours",
          status: "pending",
          category: "PROCEDURAL"
        }
      );
    }

    baseSteps.push(
      {
        step_id: baseSteps.length + 1,
        title: "Collect Physical Evidence",
        description: "Collect and seal all physical evidence, maintain chain of custody",
        timeline: "Within 7 days",
        status: "pending",
        category: "EVIDENCE"
      },
      {
        step_id: baseSteps.length + 2,
        title: "Interview Witnesses",
        description: "Record statements from all witnesses under CrPC Section 161",
        timeline: "Within 14 days",
        status: "pending",
        category: "EVIDENCE"
      },
      {
        step_id: baseSteps.length + 3,
        title: "File Charge Sheet",
        description: isPOCSO
          ? "POCSO Act Section 173 - File charge sheet within 90 days in Special Court"
          : "CrPC Section 173 - File charge sheet within 60-90 days",
        timeline: isPOCSO ? "Within 90 days" : "Within 60-90 days",
        status: "future",
        category: "FINAL"
      }
    );

    return baseSteps;
  }

  // NEW: Generate dynamic AI questions based on case details
  const generateDynamicQuestions = async (caseData, newSessionId) => {
    setIsGeneratingQuestions(true);
    try {
      // Check if conversational mode is enabled
      if (useConversationalMode) {
        // Use conversational questioning
        setShowConversationalQA(true);
        setIsSubmitting(false);
        return true;
      }
      
      // Otherwise use form-based questioning (original approach)
      const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';
      
      const response = await axios.post(`${AI_API_URL}/api/generate-questions`, {
        case_id: caseData.caseId,
        case_type: caseData.caseTitle,
        case_description: caseData.caseDescription,
        victim_age: caseData.victimAge,
        incident_date: caseData.incidentDate,
        location: caseData.victimLocation
      });

      if (response.data && response.data.questions) {
        console.log('Generated questions:', response.data.questions);
        setDynamicQuestions(response.data.questions);
        setShowDynamicQuestions(true);
        setIsSubmitting(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error generating questions:', error);
      // If question generation fails, skip to analysis
      alert('Could not generate dynamic questions. Proceeding with case analysis...');
      return false;
    } finally {
      setIsGeneratingQuestions(false);
    }
  }

  // Handle completion of conversational Q&A
  const handleConversationalComplete = async (extractedData) => {
    console.log('Conversational Q&A completed:', extractedData);
    
    // Merge extracted data with form data
    const completeFormData = {
      ...formData,
      ai_extracted_data: extractedData
    };
    
    // Hide conversational Q&A
    setShowConversationalQA(false);
    
    // Proceed with case analysis
    await proceedWithCaseAnalysis(completeFormData);
  }

  // Handle completion of dynamic questions
  const handleDynamicQuestionsComplete = async (enhancedData) => {
    console.log('Dynamic questions completed:', enhancedData);
    
    // Merge enhanced data with form data
    const completeFormData = {
      ...formData,
      ...enhancedData.structured_answers
    };
    
    // Hide questions form
    setShowDynamicQuestions(false);
    
    // Continue with case analysis using enhanced data
    await proceedWithCaseAnalysis(completeFormData);
  }

  // Separate function for case analysis after questions
  const proceedWithCaseAnalysis = async (caseData) => {
    setIsSubmitting(true);
    
    try {
      // Request legal process steps from backend
      const legalSteps = await requestLegalProcessSteps(sessionId, caseData.caseTitle);
      if (legalSteps) {
        setLegalProcessSteps(legalSteps);
      }
      
      // Show the analysis report
      setCurrentCaseId(caseData.caseId);
      setShowAnalysisReport(true);
    } catch (error) {
      console.error('Error in case analysis:', error);
      alert('Failed to complete case analysis. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsRedirecting(false);
    }
  }

  const handleSubmitCase = async () => {
    // Validate required fields
    const requiredFields = ['caseId', 'caseTitle', 'caseDescription'];
    const missingFields = requiredFields.filter(field => !formData[field] || formData[field].trim() === '');
    
    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Use the environment variable for the API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      // Generate session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 1. First create the case in database
      const dbResponse = await axios.post(`${apiBaseUrl}/api/conversation/create-with-case`, {
        caseId: formData.caseId,
        sessionId: newSessionId,
        initialData: {
          caseTitle: formData.caseTitle,
          caseType: formData.caseType || 'Other',
          caseDescription: formData.caseDescription,
          victimAge: formData.victimAge,
          victimGender: formData.victimGender,
          victimLocation: formData.victimLocation,
          incidentDate: formData.incidentDate,
          location: formData.victimLocation,
          initialDescription: formData.caseDescription
        },
        officerName: formData.officerName || 'Unknown Officer',
        department: formData.policeStation || 'Unknown Station',
        userId: null // TODO: Add actual user ID from auth
      });
      
      console.log('✅ Case created in database:', dbResponse.data);
      
      // 2. Then start AI conversation with ChatBot
      const response = await axios.post(`${apiBaseUrl}/api/chat`, { 
        message: JSON.stringify(formData)
      });
      
      if (response.data && response.data.session_id) {
        // The server returns a "response" field with text and a "session_id"
        const sessionId = response.data.session_id || newSessionId;
        const analysisResponse = response.data.response;
        
        setSessionId(sessionId);
        setCurrentCaseId(formData.caseId);
        
        // Create a mock analysis data structure for now since the server returns text
        const mockAnalysisData = {
          form_details: {
            form_name: "FORM IF5",
            document_title: "FINAL FORM/REPORT (Under Section 173 CR. P.C.)"
          },
          court_name: "",
          case_identification: {
            district: formData.victimLocation.split(',')[1]?.trim() || "",
            police_station: "",
            year: new Date().getFullYear().toString(),
            fir_no: formData.previousCaseRef || "",
            fir_date: formData.incidentDate || "",
            final_report_or_chargesheet_no: "",
            final_report_date: new Date().toISOString().split('T')[0],
            acts_and_sections: [
              { act: "IPC", section: "376" },
              { act: "IPC", section: "354" }
            ],
            other_acts_and_sections: "",
            report_type: "Charge Sheet"
          },
          report_summary: {
            type_of_final_report: "Charge Sheet",
            reason_if_unoccurred: "",
            investigating_officer_name: "",
            investigating_officer_rank: ""
          },
          complainant_details: {
            name: "Complainant",
            father_or_husband_name: ""
          },
          seized_properties_relied_upon: [],
          accused_charge_sheeted: [{
            name: "Accused",
            is_name_verified: "Yes",
            father_or_husband_name: "",
            date_or_year_of_birth: "",
            sex: "Male",
            nationality: "Indian",
            passport_info: {
              passport_no: "",
              date_of_issue: "",
              place_of_issue: ""
            },
            religion: "",
            is_sc_st: "",
            occupation: "",
            address: "",
            is_address_verified: "",
            provisional_criminal_no: "",
            regular_criminal_no: "",
            date_of_arrest: "",
            date_of_release_on_bail: "",
            date_forwarded_to_court: "",
            charged_under_acts_sections: "IPC 376, IPC 354",
            sureties_names_and_addresses: "",
            previous_convictions: "",
            status_of_accused: "Under Investigation"
          }],
          investigation_findings: {
            action_if_fr_is_false: "",
            result_of_laboratory_analysis: "Pending",
            brief_facts_of_case: formData.caseDescription || ""
          },
          submission_details: {
            is_refer_notice_served: "Yes",
            refer_notice_date: new Date().toISOString().split('T')[0],
            despatched_on_date: new Date().toISOString().split('T')[0],
            forwarding_officer: {
              name: "Officer Name",
              rank: "Inspector",
              number: "123"
            },
            submitting_investigating_officer: {
              signature: "",
              name: "IO Name",
              rank: "Sub-Inspector",
              number: "456"
            }
          },
          serverResponse: analysisResponse
        };
        
        // Store the analysis data and session info
        setAnalysisData(mockAnalysisData);
        
        // Store important data in localStorage
        localStorage.setItem('caseSwift_caseId', formData.caseId);
        localStorage.setItem('caseSwift_sessionId', sessionId);
        localStorage.setItem('caseSwift_analysisData', JSON.stringify(mockAnalysisData));
        
        // NEW: Generate dynamic questions based on case details
        const questionsGenerated = await generateDynamicQuestions(formData, sessionId);
        
        if (!questionsGenerated) {
          // If questions generation fails, proceed with normal flow
          // Automatically request investigation steps
          await requestInvestigationSteps(sessionId, formData.caseTitle);
          
          // Request legal process steps from backend
          const legalSteps = await requestLegalProcessSteps(sessionId, formData.caseTitle);
          if (legalSteps) {
            setLegalProcessSteps(legalSteps);
          }
          
          // Show success message and display analysis report
          setIsRedirecting(true);
          setTimeout(() => {
            setIsRedirecting(false);
            setShowAnalysisReport(true);
          }, 1500);
        }
        // If questions generated, flow continues in handleDynamicQuestionsComplete
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error submitting case:', error);
      alert('Error submitting case. Please check your connection and try again.');
    } finally {
      // Don't set isSubmitting false if showing questions
      if (!showDynamicQuestions) {
        setIsSubmitting(false);
      }
    }
  }

  // Generate a fallback error report if analysis data fetching fails
  const generateErrorReport = () => {
    return {
      caseClassification: "Unknown",
      complianceScore: 0,
      missingFields: ["Error fetching data"],
      requiredDocuments: ["Error fetching data"],
      legalReferences: [],
      caseAnalysisReport: "Failed to generate case analysis. Please try again."
    };
  }

  // If redirecting, show a success message
  if (isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Case Submitted Successfully!</h2>
          <p className="text-gray-600 mb-6">Loading case analysis report...</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
    );
  }
  
  // If showing form dashboard, render that component  
  if (showFormDashboard && currentCaseId) {
    return (
      <FormFillingDashboard 
        caseId={currentCaseId}
        caseData={analysisData}
        onBack={() => setShowFormDashboard(false)}
      />
    );
  }
  
  // If showing conversational Q&A, render ConversationalQuestioning
  if (showConversationalQA) {
    return (
      <ConversationalQuestioning
        caseId={currentCaseId || formData.caseId}
        sessionId={sessionId}
        caseData={formData}
        onComplete={handleConversationalComplete}
        onBack={() => {
          setShowConversationalQA(false);
          setIsSubmitting(false);
        }}
      />
    );
  }
  
  // If showing dynamic questions, render DynamicQuestionForm (legacy form-based mode)
  if (showDynamicQuestions && dynamicQuestions.length > 0) {
    return (
      <DynamicQuestionForm
        caseId={currentCaseId || formData.caseId}
        sessionId={sessionId}
        questions={dynamicQuestions}
        onComplete={handleDynamicQuestionsComplete}
        onBack={() => {
          setShowDynamicQuestions(false);
          setIsSubmitting(false);
        }}
      />
    );
  }

  // If showing analysis report, render that component
  if (showAnalysisReport && analysisData) {
    return (
      <CaseAnalysisWithForms 
        analysisData={analysisData}
        originalCaseData={formData}
        sessionId={sessionId}
        caseId={currentCaseId}
        stepsResponse={stepsResponse}
        legalProcessSteps={legalProcessSteps}
        onBack={onBack}
        onContinueToForms={() => setShowFormDashboard(true)}
      />
    );
  }

  // Form sections
  const sections = [
    { title: "Case Information", icon: "document-text" },
    { title: "Victim Details", icon: "user" },
    { title: "Evidence Collection", icon: "document-duplicate" }
  ]

  const renderSection = () => {
    switch (currentSection) {
      case 0:
        return (
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Case ID *
              </label>
              <input 
                type="text"
                value={formData.caseId}
                onChange={(e) => handleInputChange('caseId', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter a unique case identifier"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Case Title *
              </label>
              <input 
                type="text"
                value={formData.caseTitle}
                onChange={(e) => handleInputChange('caseTitle', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter a descriptive title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Case Description *
              </label>
              <textarea 
                rows="5"
                value={formData.caseDescription}
                onChange={(e) => handleInputChange('caseDescription', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Provide a detailed description of the case"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference to Previous Case (if applicable)
              </label>
              <input
                type="text"
                value={formData.previousCaseRef}
                onChange={(e) => handleInputChange('previousCaseRef', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter previous case number if related"
              />
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age *
                </label>
                <input
                  type="number"
                  value={formData.victimAge}
                  onChange={(e) => handleInputChange('victimAge', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max="120"
                  placeholder="Age"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender *
                </label>
                <select
                  value={formData.victimGender}
                  onChange={(e) => handleInputChange('victimGender', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={formData.victimLocation}
                onChange={(e) => handleInputChange('victimLocation', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="City, State, District"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incident Date *
                </label>
                <input
                  type="date"
                  value={formData.incidentDate}
                  onChange={(e) => handleInputChange('incidentDate', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incident Time
                </label>
                <input
                  type="time"
                  value={formData.incidentTime}
                  onChange={(e) => handleInputChange('incidentTime', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Evidence Upload
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 text-center">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="evidence-upload"
                />
                <label htmlFor="evidence-upload" className="cursor-pointer">
                  <div className="mx-auto w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">
                    <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, DOC, Images (max. 10MB)
                  </p>
                </label>
              </div>
            </div>

            {formData.evidenceFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Uploaded Files ({formData.evidenceFiles.length})</h4>
                <ul className="space-y-2">
                  {formData.evidenceFiles.map((file, index) => (
                    <li key={index} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <span className="text-sm truncate max-w-xs">{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 focus:outline-none"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // Main form render
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
          <h1 className="text-xl font-bold text-gray-800">New Case Entry</h1>
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
          caseId={currentCaseId}
        />

        {/* Progress Steps */}
        <div className="flex justify-between items-center mb-8">
          {sections.map((section, index) => (
            <div key={index} className="flex-1">
              <div 
                className={`flex flex-col items-center ${index > 0 ? 'ml-6' : ''}`}
              >
                <div className="flex items-center justify-center w-full">
                  {/* Line before */}
                  {index > 0 && (
                    <div 
                      className={`h-1 flex-1 ${
                        index <= currentSection ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    ></div>
                  )}
                  
                  {/* Circle */}
                  <div 
                    className={`relative flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 rounded-full transition-colors duration-300 ${
                      index < currentSection
                        ? 'bg-green-500'
                        : index === currentSection
                        ? 'bg-blue-600'
                        : 'bg-gray-300'
                    }`}
                  >
                    {index < currentSection ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    ) : (
                      <span className="text-sm font-semibold text-white">{index + 1}</span>
                    )}
                  </div>
                  
                  {/* Line after */}
                  {index < sections.length - 1 && (
                    <div 
                      className={`h-1 flex-1 ${
                        index < currentSection ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    ></div>
                  )}
                </div>
                <span className="mt-2 text-xs text-center block w-full text-gray-500">
                  {section.title}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white p-6 lg:p-8 rounded-xl shadow-lg">
          {/* Current Section Title */}
          <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-6">
            {sections[currentSection].title}
          </h2>
          
          {/* Form Fields */}
          {renderSection()}
          
          {/* Navigation Buttons */}
          <div className="flex flex-col md:flex-row justify-between mt-8 pt-6 border-t border-gray-200">
            <div>
              <span className="text-xs text-gray-500">
                Step {currentSection + 1} of {sections.length}
              </span>
            </div>
            <div className="flex flex-col lg:flex-row space-y-3 lg:space-y-0 lg:space-x-4 mt-4 md:mt-0">
              <button
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
                className="px-4 py-2 lg:px-6 lg:py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm lg:text-base"
              >
                Previous
              </button>
              
              {currentSection < sections.length - 1 ? (
                <button
                  onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
                  className="px-4 py-2 lg:px-6 lg:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base"
                >
                  Next Section
                </button>
              ) : (
                <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-4">
                  <button className="px-4 py-2 lg:px-6 lg:py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm lg:text-base">
                    Save Draft
                  </button>
                  <button 
                    onClick={handleSubmitCase}
                    disabled={isSubmitting}
                    className="px-4 py-2 lg:px-6 lg:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      'Submit Case'
                    )}
                  </button>
                  <button className="px-4 py-2 lg:px-6 lg:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm lg:text-base">
                    Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewCaseForm