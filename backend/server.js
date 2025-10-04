const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
require('dotenv').config();

// Import MongoDB connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversation');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word documents, and images are allowed.'));
    }
  }
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Conversation routes (MongoDB)
app.use('/api/conversation', conversationRoutes);

// File paths
const responsesFilePath = path.join(__dirname, '../frontend/responses.json');

// Ensure responses file exists
const initializeResponsesFile = async () => {
  try {
    await fs.ensureFile(responsesFilePath);
    const exists = await fs.pathExists(responsesFilePath);
    if (exists) {
      const content = await fs.readFile(responsesFilePath, 'utf8');
      if (!content.trim()) {
        await fs.writeFile(responsesFilePath, JSON.stringify({ cases: [] }, null, 2));
      }
    }
  } catch (error) {
    console.error('Error initializing responses file:', error);
    await fs.writeFile(responsesFilePath, JSON.stringify({ cases: [] }, null, 2));
  }
};

// Helper function to read responses
const readResponses = async () => {
  try {
    const data = await fs.readFile(responsesFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading responses:', error);
    return { cases: [] };
  }
};

// Helper function to write responses
const writeResponses = async (data) => {
  try {
    await fs.writeFile(responsesFilePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing responses:', error);
    return false;
  }
};

// Helper function to read cases.json
const readCasesData = async () => {
  try {
    const casesPath = path.join(__dirname, 'cases.json');
    const data = await fs.readFile(casesPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading cases.json:', error);
    return {};
  }
};

// Helper function to write cases.json
const writeCasesData = async (data) => {
  try {
    const casesPath = path.join(__dirname, 'cases.json');
    await fs.writeFile(casesPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing cases.json:', error);
    return false;
  }
};

// Function to generate case analysis data in the required format
const generateCaseAnalysisData = (formData, caseId) => {
  const isMinorCase = formData.victimAge && parseInt(formData.victimAge) < 18;
  const caseClassification = isMinorCase ? "POCSO Case" : "IPC Section 376 Case";
  
  // Calculate completion percentage and compliance score
  const requiredFields = ['caseId', 'caseTitle', 'caseDescription', 'victimAge', 'victimGender', 'victimLocation', 'incidentDate'];
  const filledFields = requiredFields.filter(field => formData[field] && formData[field].trim() !== '');
  const completionPercentage = Math.round((filledFields.length / requiredFields.length) * 100);
  const complianceScore = Math.floor(Math.random() * 30) + 70; // Random score between 70-100
  
  // Determine missing fields
  const missingFields = requiredFields.filter(field => !formData[field] || formData[field].trim() === '');
  
  // Set required documents based on case type
  const requiredDocuments = isMinorCase ? [
    "FIR Copy",
    "Medical Examination Report",
    "Victim Statement (Recorded by Magistrate)",
    "Age Proof of Victim",
    "Witness Statements",
    "Evidence Documentation",
    "Scene of Crime Documentation"
  ] : [
    "FIR Copy",
    "Medical Examination Report",
    "Victim Statement",
    "Witness Statements",
    "Evidence Documentation",
    "Investigation Report",
    "Scene of Crime Documentation"
  ];
  
  // Set legal references based on case type
  const legalReferences = isMinorCase ? [
    {
      "title": "POCSO Act Section 4",
      "description": "Punishment for penetrative sexual assault"
    },
    {
      "title": "POCSO Act Section 29",
      "description": "Presumption as to certain offences"
    },
    {
      "title": "Juvenile Justice Act, Section 74",
      "description": "Prohibition on disclosure of identity of children"
    }
  ] : [
    {
      "title": "BNS Section 376",
      "description": "Definition of sexual assault and prescribed punishments"
    },
    {
      "title": "Criminal Procedure Code, Section 164A",
      "description": "Medical examination of victim of rape"
    },
    {
      "title": "Indian Evidence Act, Section 114A",
      "description": "Presumption as to absence of consent in certain prosecutions for rape"
    }
  ];
  
  // Set legal requirements based on case type
  const legalRequirements = isMinorCase ? [
    "POCSO Act compliance",
    "Special Court proceedings",
    "Child-friendly procedures",
    "Evidence chain of custody",
    "Mandatory reporting",
    "Child Welfare Committee involvement"
  ] : [
    "IPC/BNS Section 376 compliance",
    "Regular court proceedings",
    "Victim impact statement",
    "Evidence chain of custody",
    "Proper documentation of consent/non-consent",
    "Medical evidence within 72 hours"
  ];
  
  // Set investigation steps based on case type
  const investigationSteps = isMinorCase ? {
    "Medical examination within 24 hours": { "completed": false },
    "Statement recording by Magistrate": { "completed": false },
    "Child Welfare Committee notification": { "completed": false },
    "Special Court registration": { "completed": false },
    "Support person assignment": { "completed": false },
    "Background verification of accused": { "completed": false },
    "Charge sheet preparation": { "completed": false }
  } : {
    "Medical examination within 72 hours": { "completed": false },
    "Detailed victim statement recording": { "completed": false },
    "Witness interviews and statements": { "completed": false },
    "Scene reconstruction and evidence collection": { "completed": false },
    "Forensic analysis of physical evidence": { "completed": false },
    "Background verification of accused": { "completed": false },
    "Charge sheet preparation": { "completed": false }
  };
  
  // Set urgent actions for minor cases
  const urgentActions = isMinorCase && completionPercentage < 90 ? [
    "Immediate Child Welfare Committee notification required",
    "Support person needs to be assigned within 24 hours"
  ] : [];
  
  // Determine timeline compliance
  const timelineCompliance = completionPercentage >= 90 ? "On Track" : 
                            completionPercentage >= 70 ? "Partially Complete" : "Delayed";
  
  // Risk assessment
  const riskAssessment = isMinorCase ? "High Risk" : 
                        completionPercentage < 70 ? "High Risk" : 
                        completionPercentage < 85 ? "Medium Risk" : "Low Risk";
  
  // Generate case analysis report
  const caseAnalysisReport = `This ${caseClassification} requires ${isMinorCase ? 'immediate attention to' : 'standard processing within statutory timelines. The case has a compliance score of ' + complianceScore + '% and is classified as ' + riskAssessment + ' risk level. Follow the investigation steps carefully and ' + (urgentActions.length > 0 ? 'address the urgent actions immediately.' : 'ensure all required documents are collected.')}`;
  
  return {
    caseId: caseId,
    caseClassification: caseClassification,
    complianceScore: complianceScore,
    completionPercentage: completionPercentage,
    missingFields: missingFields,
    requiredDocuments: requiredDocuments,
    legalReferences: legalReferences,
    legalRequirements: legalRequirements,
    investigationSteps: investigationSteps,
    relatedCases: [
      "Similar case patterns from database",
      "Relevant precedent cases",
      "Recent court decisions"
    ],
    urgentActions: urgentActions,
    timelineCompliance: timelineCompliance,
    riskAssessment: riskAssessment,
    caseAnalysisReport: caseAnalysisReport
  };
};

// Function to save analyzed case to cases.json
const saveAnalyzedCase = async (formData, caseId) => {
  try {
    const casesData = await readCasesData();
    const analysisData = generateCaseAnalysisData(formData, caseId);
    
    // Add the new case to the cases data
    casesData[caseId] = analysisData;
    
    // Write back to cases.json
    await writeCasesData(casesData);
    console.log(`✅ Case ${caseId} saved to cases.json successfully`);
    
    return analysisData;
  } catch (error) {
    console.error('Error saving analyzed case:', error);
    throw error;
  }
};

// API Routes

// Text extraction endpoint
app.post('/api/extract-text', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const fileBuffer = file.buffer;
    let extractedText = '';

    console.log(`Processing file: ${file.originalname}, MIME type: ${file.mimetype}`);

    // Extract text based on file type
    switch (file.mimetype) {
      case 'application/pdf':
        try {
          console.log('Processing PDF file...');
          const pdfData = await pdfParse(fileBuffer);
          extractedText = pdfData.text;
          
          // If no text found or very little text, it might be an image-based PDF
          if (!extractedText || extractedText.trim().length < 50) {
            console.log('PDF has minimal text, attempting OCR on PDF content...');
            
            try {
              // Use Tesseract to extract text from the PDF as if it's an image
              const { data: { text } } = await Tesseract.recognize(fileBuffer, 'eng', {
                logger: m => console.log('OCR Progress:', m.status, m.progress)
              });
              
              if (text && text.trim().length > extractedText.length) {
                extractedText = text;
                console.log('OCR extracted more text than PDF parsing');
              }
            } catch (ocrError) {
              console.log('OCR on PDF failed, using text-based extraction result:', ocrError.message);
            }
          }
          
          // If still no meaningful text, inform user
          if (!extractedText || extractedText.trim().length < 10) {
            throw new Error('No readable text found in PDF. The document may be encrypted, corrupted, or contain only non-text elements.');
          }
          
        } catch (error) {
          console.error('PDF parsing error:', error);
          throw new Error('Failed to extract text from PDF: ' + error.message);
        }
        break;

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        try {
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedText = result.value;
        } catch (error) {
          console.error('Word document parsing error:', error);
          throw new Error('Failed to extract text from Word document');
        }
        break;

      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
      case 'image/bmp':
      case 'image/tiff':
        try {
          console.log('Processing image file with OCR...');
          const { data: { text } } = await Tesseract.recognize(fileBuffer, 'eng', {
            logger: m => {
              if (m.status === 'recognizing text') {
                console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
              }
            }
          });
          extractedText = text;
          
          if (!extractedText || extractedText.trim().length < 5) {
            throw new Error('No readable text found in the image. The image may be too blurry, low quality, or contain no text.');
          }
          
        } catch (error) {
          console.error('OCR processing error:', error);
          throw new Error('Failed to extract text from image: ' + error.message);
        }
        break;

      default:
        throw new Error('Unsupported file type');
    }

    // Clean up the extracted text
    extractedText = extractedText.trim();
    
    if (!extractedText) {
      return res.status(400).json({ error: 'No text could be extracted from the document' });
    }

    res.json({
      success: true,
      text: extractedText,
      filename: file.originalname,
      fileType: file.mimetype
    });

  } catch (error) {
    console.error('Text extraction error:', error);
    res.status(500).json({
      error: error.message || 'Failed to extract text from document'
    });
  }
});

// Submit initial case data without questions
app.post('/api/submit-case', async (req, res) => {
  try {
    const caseData = req.body;
    console.log('Received case data:', caseData);

    // Store the case without questions
    const responses = await readResponses();
    const newCase = {
      id: Date.now().toString(),
      submittedAt: new Date().toISOString(),
      basicInfo: caseData,
      answers: {},
      completed: false
    };

    responses.cases.push(newCase);
    await writeResponses(responses);

    res.json({
      success: true,
      caseId: newCase.id
    });

  } catch (error) {
    console.error('Error in submit-case:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process case submission',
      details: error.message
    });
  }
});

// Mark case as completed
app.post('/api/complete-case', async (req, res) => {
  try {
    const { caseId } = req.body;

    if (!caseId) {
      return res.status(400).json({
        success: false,
        error: 'Case ID is required'
      });
    }

    // Read current responses
    const responses = await readResponses();
    
    // Find the case
    const caseIndex = responses.cases.findIndex(c => c.id === caseId);
    
    if (caseIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Case not found'
      });
    }

    // Update the case as completed
    responses.cases[caseIndex].completed = true;
    responses.cases[caseIndex].completedAt = new Date().toISOString();

    // Write back to file
    const writeSuccess = await writeResponses(responses);

    if (writeSuccess) {
      res.json({
        success: true,
        message: 'Case marked as completed',
        case: responses.cases[caseIndex]
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update case'
      });
    }

  } catch (error) {
    console.error('Error in submit-answers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit answers',
      details: error.message
    });
  }
});

// Case analysis endpoint - returns analysis data for a case
app.post('/api/case', async (req, res) => {
  try {
    const { caseId, formData } = req.body;
    console.log('Case analysis request:', caseId ? `Case ID: ${caseId}` : 'Form data submission');

    try {
      // Read the cases data from cases.json
      const casesPath = path.join(__dirname, 'cases.json');
      const casesContent = await fs.readFile(casesPath, 'utf8');
      const cases = JSON.parse(casesContent);
      
      let analysis;
      
      if (caseId && cases[caseId]) {
        // If a valid caseId is provided, retrieve that specific case
        analysis = cases[caseId];
        console.log(`Returning case data for case ID: ${caseId}`);
      } else if (formData) {
        // If form data is provided but no existing caseId, create a new case
        const newCaseId = formData.caseId || Date.now().toString();
        
        // Generate and save new case analysis data
        analysis = await saveAnalyzedCase(formData, newCaseId);
        
        // Also save to responses.json for backward compatibility
        const responses = await readResponses();
        const newCase = {
          id: newCaseId,
          submittedAt: new Date().toISOString(),
          basicInfo: formData,
          completed: true
        };
        
        responses.cases.push(newCase);
        await writeResponses(responses);
        
        console.log(`Created new case with ID: ${newCaseId}`);
      } else {
        // If no valid caseId and no formData, return the first case as a default
        const defaultCaseId = Object.keys(cases)[0];
        analysis = cases[defaultCaseId];
        console.log(`No case ID or form data provided, returning default case: ${defaultCaseId}`);
      }
      
      // Return the analysis data
      return res.json({
        success: true,
        analysis
      });
    } catch (readError) {
      console.error('Error reading cases.json:', readError);
      throw new Error('Failed to read case data');
    }
    
    // Add a case analysis report text if not present
    if (!analysis.caseAnalysisReport) {
      analysis.caseAnalysisReport = `This ${isMinor ? 'POCSO' : 'IPC Section 376'} case requires ${urgentActions.length > 0 ? 'immediate attention to address missing critical information' : 'standard processing within statutory timelines'}. The case has a compliance score of ${analysis.complianceScore}% and is classified as ${analysis.riskAssessment} risk level. Follow the investigation steps carefully and ensure all required documents are collected.`;
    }
    
    // Make sure all array properties exist to avoid frontend mapping errors
    analysis.legalReferences = analysis.legalReferences || [];
    analysis.missingFields = analysis.missingFields || [];
    analysis.requiredDocuments = analysis.requiredDocuments || [];
    analysis.relatedCases = analysis.relatedCases || [];
    analysis.urgentActions = analysis.urgentActions || [];
    
    res.json({
      success: true,
      analysis
    });
    
  } catch (error) {
    console.error('Error in case analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate case analysis'
    });
  }
});

// Submit victim case (direct submission without AI questions)
app.post('/api/submit-victim-case', async (req, res) => {
  try {
    const caseData = req.body;
    console.log('Received victim case data:', caseData);

    // Validate required fields
    const requiredFields = ['name', 'age', 'gender', 'incidentDate', 'location', 'description', 'offenceType'];
    const missingFields = requiredFields.filter(field => !caseData[field] || caseData[field].toString().trim() === '');
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields: missingFields
      });
    }

    // Validate contact information (either phone or email required)
    if (!caseData.phone?.trim() && !caseData.email?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Either phone number or email is required'
      });
    }

    // Store the victim case
    const responses = await readResponses();
    const newCase = {
      id: caseData.caseId || `VIC-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      submissionType: 'victim_input',
      status: 'Pending IO Assignment',
      basicInfo: {
        caseId: caseData.caseId,
        caseTitle: caseData.caseTitle,
        caseDescription: caseData.description,
        victimAge: caseData.age,
        victimGender: caseData.gender,
        victimLocation: caseData.location,
        incidentDate: caseData.incidentDate,
        incidentTime: caseData.incidentTime || null
      },
      victimDetails: {
        name: caseData.name,
        age: caseData.age,
        gender: caseData.gender,
        phone: caseData.phone || null,
        email: caseData.email || null
      },
      incidentDetails: {
        date: caseData.incidentDate,
        time: caseData.incidentTime || null,
        location: caseData.location,
        description: caseData.description,
        offenceType: caseData.offenceType
      },
      evidence: {
        files: caseData.evidenceFiles || [],
        fileCount: (caseData.evidenceFiles || []).length
      },
      completed: true,
      requiresIOAssignment: true
    };

    responses.cases.push(newCase);
    const writeSuccess = await writeResponses(responses);

    if (writeSuccess) {
      res.json({
        success: true,
        message: 'Victim case submitted successfully',
        caseId: newCase.id,
        case: newCase
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save case data'
      });
    }

  } catch (error) {
    console.error('Error in submit-victim-case:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit victim case',
      details: error.message
    });
  }
});

// Get all cases
app.get('/api/cases', async (req, res) => {
  try {
    // Read cases from the new cases.json file
    const casesPath = path.join(__dirname, 'cases.json');
    const casesContent = await fs.readFile(casesPath, 'utf8');
    const casesData = JSON.parse(casesContent);
    
    // Transform the cases object into an array with additional metadata for the UI
    const casesArray = Object.entries(casesData).map(([caseId, caseData]) => {
      // Calculate the completion percentage of investigation steps
      const investigationSteps = caseData.investigationSteps || {};
      const totalSteps = Object.keys(investigationSteps).length;
      const completedSteps = Object.values(investigationSteps).filter(step => step.completed).length;
      const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      
      // Create a case object with the format expected by the frontend
      return {
        id: caseId,
        title: caseData.caseClassification || 'Unclassified Case',
        victimCode: `V-${caseId.substring(0, 4)}`,
        offenseType: caseData.caseClassification || 'Unknown',
        status: progressPercentage === 100 ? 'completed' : 'active',
        priority: caseData.riskAssessment?.includes('High') ? 'high' : 
                 caseData.riskAssessment?.includes('Medium') ? 'medium' : 'low',
        progress: progressPercentage,
        dateCreated: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
        lastUpdated: '1 day ago',
        location: 'India',
        description: caseData.caseAnalysisReport || 'No description available',
        pendingTasks: caseData.missingFields || [],
        evidence: caseData.requiredDocuments || [],
        assignedOfficer: 'Inspector Kumar',
        timeline: [
          { date: new Date().toISOString().split('T')[0], event: 'Case registered', status: 'completed' }
        ],
        // Adding additional case details from cases.json
        legalReferences: caseData.legalReferences || [],
        legalRequirements: caseData.legalRequirements || [],
        investigationSteps: caseData.investigationSteps || {},
        relatedCases: caseData.relatedCases || [],
        riskAssessment: caseData.riskAssessment || 'Low Risk',
        complianceScore: caseData.complianceScore || 0
      };
    });
    
    res.json({
      success: true,
      cases: casesArray
    });
  } catch (error) {
    console.error('Error in get cases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cases'
    });
  }
});

// Get specific case by ID
app.get('/api/cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const responses = await readResponses();
    const case_data = responses.cases.find(c => c.id === id);

    if (!case_data) {
      return res.status(404).json({
        success: false,
        error: 'Case not found'
      });
    }

    res.json({
      success: true,
      case: case_data
    });
  } catch (error) {
    console.error('Error in get case:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve case'
    });
  }
});

// Case analysis endpoint - returns analysis data for frontend
app.post('/api/case', async (req, res) => {
  try {
    const { caseId, caseDetails } = req.body;
    
    if (!caseId && !caseDetails) {
      return res.status(400).json({
        success: false,
        error: 'Either caseId or caseDetails is required'
      });
    }
    
    let caseData;
    
    // If caseId provided, fetch from existing cases
    if (caseId) {
      const responses = await readResponses();
      caseData = responses.cases.find(c => c.id === caseId);
      
      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found'
        });
      }
    } else {
      // Use provided case details
      caseData = caseDetails;
    }
    
    // Determine if it's a minor case
    const isMinorCase = caseData.basicInfo?.victimAge && parseInt(caseData.basicInfo.victimAge) < 18;
    
    // Prepare analysis data based on case type
    let analysisData = {
      caseClassification: isMinorCase ? "POCSO Case" : "IPC Section 376",
      complianceScore: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
      missingFields: [],
      requiredDocuments: [],
      legalReferences: []
    };
    
    // Add case-specific data
    if (isMinorCase) {
      analysisData.missingFields = [
        "Child Welfare Committee Notification",
        "Support Person Assignment",
        "Special Court Designation"
      ];
      
      analysisData.requiredDocuments = [
        "Medical Examination Report",
        "Statement recorded under Section 164 CrPC",
        "Age Proof Document",
        "Child Welfare Committee Report"
      ];
      
      analysisData.legalReferences = [
        {
          title: "POCSO Act Section 19",
          description: "Mandatory reporting of offences"
        },
        {
          title: "POCSO Act Section 24",
          description: "Recording statement of a child"
        },
        {
          title: "POCSO Act Section 26",
          description: "Additional provisions regarding statement to be recorded"
        }
      ];
      
      analysisData.caseAnalysisReport = "This case involves a minor victim and falls under the POCSO Act. Special provisions for child victims must be followed, including appointment of support person and notification to Child Welfare Committee. The case must be tried in a Special Court designated under the POCSO Act.";
      
    } else {
      // Adult victim case
      analysisData.missingFields = [
        "Detailed Medical Report",
        "Scene of Crime Photographs",
        "List of Witnesses"
      ];
      
      analysisData.requiredDocuments = [
        "FIR Copy",
        "Medical Examination Report",
        "Statement under Section 164 CrPC",
        "Scene of Crime Report"
      ];
      
      analysisData.legalReferences = [
        {
          title: "IPC Section 376",
          description: "Punishment for sexual assault"
        },
        {
          title: "CrPC Section 154",
          description: "Information in cognizable cases"
        },
        {
          title: "CrPC Section 164",
          description: "Recording of confessions and statements"
        }
      ];
      
      analysisData.caseAnalysisReport = "This case involves an adult victim and falls under IPC Section 376. Standard investigation protocols should be followed, with special attention to medical examination and preserving crime scene evidence. Witness testimonies will be critical for establishing the case.";
    }
    
    res.json({
      success: true,
      analysis: analysisData
    });
    
  } catch (error) {
    console.error('Error in case analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate case analysis',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'CaseSwift Backend is running',
    timestamp: new Date().toISOString()
  });
});

// API endpoint to update a specific investigation step
app.post('/api/update-steps', async (req, res) => {
  try {
    const { caseId, stepName, completed } = req.body;
    
    if (!caseId) {
      return res.status(400).json({
        success: false,
        error: 'Case ID is required'
      });
    }
    
    if (!stepName) {
      return res.status(400).json({
        success: false,
        error: 'Step name is required'
      });
    }
    
    if (typeof completed !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Completed status must be a boolean'
      });
    }
    
    // Read the cases data from cases.json
    const casesPath = path.join(__dirname, 'cases.json');
    const casesContent = await fs.readFile(casesPath, 'utf8');
    const cases = JSON.parse(casesContent);
    
    // Check if the case exists
    if (!cases[caseId]) {
      return res.status(404).json({
        success: false,
        error: 'Case not found'
      });
    }
    
    // Check if the step exists in the case's investigationSteps object
    if (!cases[caseId].investigationSteps || !cases[caseId].investigationSteps[stepName]) {
      return res.status(404).json({
        success: false,
        error: 'Investigation step not found'
      });
    }
    
    // Update the specified step's completion status
    cases[caseId].investigationSteps[stepName].completed = completed;
    
    // Save the updated cases data back to the file
    await fs.writeFile(casesPath, JSON.stringify(cases, null, 2));
    
    res.json({
      success: true,
      message: 'Investigation step updated successfully',
      stepName,
      completed
    });
  } catch (error) {
    console.error('Error updating investigation steps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update investigation steps'
    });
  }
});

// Start server
// API endpoint to handle case edit prompts
app.post('/api/case/edit', async (req, res) => {
  try {
    const { caseId, prompt } = req.body;
    
    if (!caseId) {
      return res.status(400).json({
        success: false,
        error: 'Case ID is required'
      });
    }
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'A valid prompt is required'
      });
    }
    
    // For now, just log the prompt and return success
    console.log(`Received prompt for case ${caseId}:`, prompt);
    
    // Just return 200 OK as requested, actual implementation will come later
    res.status(200).json({
      success: true,
      message: 'Prompt received successfully',
      caseId,
      promptLength: prompt.length
    });
    
  } catch (error) {
    console.error('Error processing case edit prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process prompt'
    });
  }
});

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    await initializeResponsesFile();
    app.listen(PORT, () => {
      console.log(`🚀 CaseSwift Backend server running on port ${PORT}`);
      console.log(`📁 Responses file: ${responsesFilePath}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`💬 Conversation API: http://localhost:${PORT}/api/conversation`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
