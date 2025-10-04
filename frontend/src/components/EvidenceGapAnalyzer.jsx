import React, { useState } from 'react';
import axios from 'axios';
import '../styles/EvidenceGapAnalyzer.css';

// Get AI API URL from environment variable
const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export default function EvidenceGapAnalyzer({ caseId, caseData }) {
  const [evidenceList, setEvidenceList] = useState([]);
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newEvidence, setNewEvidence] = useState('');

  const analyzeGaps = async () => {
    if (evidenceList.length === 0) {
      alert('Please add at least one evidence item before analyzing.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${AI_API_URL}/api/analyze-evidence-gaps`, {
        case_id: caseId,
        case_type: caseData.caseClassification || caseData.classification || 'BNS General',
        evidence_list: evidenceList
      });
      
      setGapAnalysis(response.data.gap_analysis);
    } catch (error) {
      console.error("Error analyzing evidence gaps:", error);
      alert('Failed to analyze evidence gaps. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addEvidence = () => {
    if (newEvidence.trim()) {
      setEvidenceList([...evidenceList, newEvidence.trim()]);
      setNewEvidence('');
    }
  };

  const removeEvidence = (index) => {
    setEvidenceList(evidenceList.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addEvidence();
    }
  };

  return (
    <div className="evidence-gap-analyzer">
      <div className="analyzer-header">
        <h2>🔍 AI Evidence Gap Analysis</h2>
        <p className="subtitle">Identify missing or weak evidence in your investigation</p>
      </div>

      <div className="evidence-input-section">
        <h3>Current Evidence Collected</h3>
        <div className="input-group">
          <input 
            type="text" 
            placeholder="Enter evidence item (e.g., Medical report, Witness statement)..."
            value={newEvidence}
            onChange={(e) => setNewEvidence(e.target.value)}
            onKeyPress={handleKeyPress}
            className="evidence-input"
          />
          <button onClick={addEvidence} className="add-btn">
            + Add
          </button>
        </div>

        <div className="evidence-list">
          {evidenceList.length === 0 ? (
            <p className="no-evidence">No evidence items added yet. Start by adding evidence collected so far.</p>
          ) : (
            evidenceList.map((item, idx) => (
              <div key={idx} className="evidence-item">
                <span className="evidence-icon">📄</span>
                <span className="evidence-text">{item}</span>
                <button 
                  onClick={() => removeEvidence(idx)} 
                  className="remove-btn"
                  title="Remove this evidence"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <button 
        onClick={analyzeGaps} 
        disabled={loading || evidenceList.length === 0}
        className="analyze-btn"
      >
        {loading ? (
          <>
            <span className="spinner-small"></span>
            Analyzing...
          </>
        ) : (
          <>
            🤖 Analyze Evidence Gaps with AI
          </>
        )}
      </button>

      {gapAnalysis && (
        <div className="gap-analysis-result">
          <div className="result-header">
            <h3>📊 AI Analysis Results</h3>
            <span className="ai-badge">AI Generated</span>
          </div>
          <div className="analysis-content">
            {gapAnalysis.split('\n').map((line, index) => {
              // Check if line is a heading (contains ###, ##, or is all caps)
              const isHeading = line.startsWith('###') || line.startsWith('##') || 
                               (line === line.toUpperCase() && line.length > 5 && line.length < 50);
              
              if (isHeading) {
                return (
                  <h4 key={index} className="analysis-heading">
                    {line.replace(/#+/g, '').trim()}
                  </h4>
                );
              } else if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                return (
                  <li key={index} className="analysis-list-item">
                    {line.replace(/^[-•]\s*/, '')}
                  </li>
                );
              } else if (line.trim()) {
                return (
                  <p key={index} className="analysis-paragraph">
                    {line}
                  </p>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
