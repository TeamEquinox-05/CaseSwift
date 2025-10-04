import React, { useState } from 'react';
import axios from 'axios';
import '../styles/DocumentQualityReviewer.css';

// Get AI API URL from environment variable
const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export default function DocumentQualityReviewer({ caseId, caseData, documentType, documentContent }) {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState(documentType || 'FIR');
  const [docContent, setDocContent] = useState(documentContent || '');

  const documentTypes = [
    'FIR',
    'Charge Sheet',
    'Victim Statement',
    'Witness Statement',
    'Medical Report',
    'Investigation Report'
  ];

  const reviewDocument = async () => {
    if (!docContent.trim()) {
      alert('Please enter document content to review.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${AI_API_URL}/api/review-document-quality`, {
        case_id: caseId,
        case_type: caseData.caseClassification || caseData.classification || 'BNS General',
        document_type: selectedDocType,
        document_content: docContent
      });
      
      setReview(response.data.quality_review);
    } catch (error) {
      console.error("Error reviewing document:", error);
      alert('Failed to review document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="document-quality-reviewer">
      <div className="reviewer-header">
        <h2>📋 AI Document Quality Checker</h2>
        <p className="subtitle">Get AI-powered feedback on legal document quality and completeness</p>
      </div>

      <div className="document-input-section">
        <div className="form-group">
          <label htmlFor="docType">Document Type</label>
          <select 
            id="docType"
            value={selectedDocType} 
            onChange={(e) => setSelectedDocType(e.target.value)}
            className="doc-type-select"
          >
            {documentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="docContent">Document Content</label>
          <textarea 
            id="docContent"
            placeholder={`Enter the ${selectedDocType} content here...\n\nExample for FIR:\n- Date and time of incident\n- Place of occurrence\n- Details of the offense\n- Statement of complainant\n- Sections applicable\n- etc.`}
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
            className="doc-content-textarea"
            rows={12}
          />
        </div>
      </div>

      <button 
        onClick={reviewDocument} 
        disabled={loading || !docContent.trim()}
        className="review-btn"
      >
        {loading ? (
          <>
            <span className="spinner-small"></span>
            Reviewing...
          </>
        ) : (
          <>
            🤖 AI Quality Check
          </>
        )}
      </button>

      {review && (
        <div className="quality-review-result">
          <div className="result-header">
            <h3>✅ AI Document Review - {selectedDocType}</h3>
            <span className="ai-badge">AI Generated</span>
          </div>
          <div className="review-content">
            {review.split('\n').map((line, index) => {
              // Check if line is a heading
              const isHeading = line.startsWith('###') || line.startsWith('##') || 
                               line.startsWith('**') || 
                               (line === line.toUpperCase() && line.length > 5 && line.length < 60);
              
              // Check if line starts with a number (numbered list)
              const isNumberedList = /^\d+\./.test(line.trim());
              
              if (isHeading) {
                return (
                  <h4 key={index} className="review-heading">
                    {line.replace(/#+|\*\*/g, '').trim()}
                  </h4>
                );
              } else if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                return (
                  <li key={index} className="review-list-item">
                    {line.replace(/^[-•]\s*/, '')}
                  </li>
                );
              } else if (isNumberedList) {
                return (
                  <li key={index} className="review-numbered-item">
                    {line.trim()}
                  </li>
                );
              } else if (line.trim()) {
                // Highlight certain keywords
                let formattedLine = line;
                const keywords = ['CRITICAL', 'WARNING', 'ERROR', 'MISSING', 'INCOMPLETE', 'EXCELLENT', 'GOOD'];
                keywords.forEach(keyword => {
                  const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                  formattedLine = formattedLine.replace(regex, `<span class="keyword ${keyword.toLowerCase()}">${keyword}</span>`);
                });
                
                return (
                  <p key={index} className="review-paragraph" dangerouslySetInnerHTML={{ __html: formattedLine }} />
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
