import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AIChecklistDashboard from './AIChecklistDashboard';
import EvidenceGapAnalyzer from './EvidenceGapAnalyzer';
import DocumentQualityReviewer from './DocumentQualityReviewer';
import ChatModal from './ChatModal';
import '../styles/CaseDetailAI.css';

// Get API URLs from environment variables
const NODE_API_URL = import.meta.env.VITE_NODE_API_URL || 'http://localhost:3001';

export default function CaseDetailAI() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('checklist');
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    fetchCaseData();
  }, [caseId]);

  const fetchCaseData = async () => {
    setLoading(true);
    try {
      // Try to get from backend
      const response = await axios.get(`${NODE_API_URL}/api/cases/${caseId}`);
      if (response.data.success) {
        setCaseData(response.data.case.basicInfo || response.data.case);
      }
    } catch (error) {
      console.error('Error fetching case data:', error);
      // Try to get from cases.json via case analysis endpoint
      try {
        const analysisResponse = await axios.post(`${NODE_API_URL}/api/case`, {
          caseId: caseId
        });
        if (analysisResponse.data.success) {
          const analysis = analysisResponse.data.analysis;
          setCaseData({
            caseId: analysis.caseId,
            caseClassification: analysis.caseClassification,
            victimAge: 18, // Default
            caseDescription: analysis.caseAnalysisReport,
            classification: analysis.caseClassification
          });
        }
      } catch (err) {
        console.error('Error fetching case analysis:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner-large"></div>
        <p>Loading case details...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="error-page">
        <h2>Case Not Found</h2>
        <p>The case with ID {caseId} could not be found.</p>
        <button onClick={() => navigate('/cases')} className="btn-primary">
          Back to Cases
        </button>
      </div>
    );
  }

  return (
    <div className="case-detail-ai">
      {/* Header */}
      <div className="case-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Back
        </button>
        <div className="header-content">
          <h1>Case: {caseData.caseId || caseId}</h1>
          <span className="case-classification">
            {caseData.caseClassification || caseData.classification || 'General Case'}
          </span>
        </div>
        <button onClick={() => setShowChat(true)} className="chat-btn">
          💬 AI Assistant
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab ${activeTab === 'checklist' ? 'active' : ''}`}
          onClick={() => setActiveTab('checklist')}
        >
          <span className="tab-icon">✅</span>
          AI Checklist
        </button>
        <button 
          className={`tab ${activeTab === 'evidence' ? 'active' : ''}`}
          onClick={() => setActiveTab('evidence')}
        >
          <span className="tab-icon">🔍</span>
          Evidence Analysis
        </button>
        <button 
          className={`tab ${activeTab === 'document' ? 'active' : ''}`}
          onClick={() => setActiveTab('document')}
        >
          <span className="tab-icon">📋</span>
          Document Review
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'checklist' && (
          <AIChecklistDashboard 
            caseId={caseData.caseId || caseId}
            caseData={caseData}
          />
        )}
        {activeTab === 'evidence' && (
          <EvidenceGapAnalyzer 
            caseId={caseData.caseId || caseId}
            caseData={caseData}
          />
        )}
        {activeTab === 'document' && (
          <DocumentQualityReviewer 
            caseId={caseData.caseId || caseId}
            caseData={caseData}
          />
        )}
      </div>

      {/* Chat Modal */}
      <ChatModal 
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        sessionId={caseData.caseId || caseId}
        caseId={caseData.caseId || caseId}
      />
    </div>
  );
}
