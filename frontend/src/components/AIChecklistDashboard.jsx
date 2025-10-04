import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/AIChecklistDashboard.css';

// Get AI API URL from environment variable
const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export default function AIChecklistDashboard({ caseId, caseData }) {
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextAction, setNextAction] = useState(null);
  const [error, setError] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (caseId && caseData) {
      generateChecklist();
    }
  }, [caseId, caseData]);

  const generateChecklist = async () => {
    setLoading(true);
    setError(null);
    try {
      // Generate checklist from AI
      const checklistResponse = await axios.post(`${AI_API_URL}/api/generate-checklist`, {
        case_id: caseId,
        case_type: caseData.caseClassification || caseData.classification || 'BNS General',
        victim_age: parseInt(caseData.victimAge) || 18,
        incident_details: caseData.incidentDetails || caseData.caseDescription || '',
        current_status: "Initial registration"
      });
      
      setChecklist(checklistResponse.data.checklist);
      
      // Get next action recommendation
      const completedSteps = checklistResponse.data.checklist
        .filter(item => item.completed)
        .map(item => item.task);
      const pendingSteps = checklistResponse.data.checklist
        .filter(item => !item.completed)
        .map(item => item.task);
      
      const nextActionResponse = await axios.post(`${AI_API_URL}/api/next-action`, {
        case_id: caseId,
        case_type: caseData.caseClassification || caseData.classification || 'BNS General',
        completed_steps: completedSteps,
        pending_steps: pendingSteps
      });
      
      setNextAction(nextActionResponse.data.recommendation);
    } catch (error) {
      console.error("Error generating checklist:", error);
      setError(error.response?.data?.detail || "Failed to generate checklist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = async (stepId) => {
    const updatedChecklist = checklist.map(item => 
      item.step_id === stepId ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updatedChecklist);
    
    // Regenerate next action after update
    try {
      const completedSteps = updatedChecklist
        .filter(item => item.completed)
        .map(item => item.task);
      const pendingSteps = updatedChecklist
        .filter(item => !item.completed)
        .map(item => item.task);
      
      const response = await axios.post(`${AI_API_URL}/api/next-action`, {
        case_id: caseId,
        case_type: caseData.caseClassification || caseData.classification || 'BNS General',
        completed_steps: completedSteps,
        pending_steps: pendingSteps
      });
      
      setNextAction(response.data.recommendation);
    } catch (error) {
      console.error("Error updating next action:", error);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    await generateChecklist();
    setRegenerating(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">🤖 AI is analyzing your case and generating investigation checklist...</p>
        <p className="loading-subtext">This may take a few moments</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h3>Error Generating Checklist</h3>
        <p>{error}</p>
        <button onClick={generateChecklist} className="retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  const mandatorySteps = checklist.filter(item => item.category === 'MANDATORY');
  const optionalSteps = checklist.filter(item => item.category !== 'MANDATORY');
  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="ai-checklist-dashboard">
      <div className="dashboard-header">
        <h1>🤖 AI Investigation Checklist</h1>
        <p className="case-id">Case ID: {caseId}</p>
      </div>

      {/* Progress Overview */}
      <div className="progress-card">
        <h2>Investigation Progress</h2>
        <div className="progress-stats">
          <div className="stat">
            <span className="stat-value">{completedCount}/{totalCount}</span>
            <span className="stat-label">Steps Completed</span>
          </div>
          <div className="stat">
            <span className="stat-value">{completionPercentage}%</span>
            <span className="stat-label">Overall Progress</span>
          </div>
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ 
              width: `${completionPercentage}%`,
              backgroundColor: completionPercentage < 50 ? '#ef4444' : completionPercentage < 80 ? '#f59e0b' : '#10b981'
            }}
          ></div>
        </div>
      </div>

      {/* AI Next Action Recommendation */}
      {nextAction && (
        <div className="next-action-card">
          <div className="card-header">
            <h3>🎯 AI Recommends Next Action</h3>
            <span className="ai-badge">AI Powered</span>
          </div>
          <div className="recommendation-content">
            {nextAction.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* Mandatory Steps */}
      <div className="checklist-section">
        <h3 className="section-title">
          <span className="icon">🔴</span>
          Mandatory Steps ({mandatorySteps.filter(s => s.completed).length}/{mandatorySteps.length})
        </h3>
        {mandatorySteps.length === 0 ? (
          <p className="no-items">No mandatory steps generated yet.</p>
        ) : (
          mandatorySteps.map(item => (
            <div 
              key={item.step_id} 
              className={`checklist-item ${item.completed ? 'completed' : ''} ${item.priority === 'HIGH' ? 'high-priority' : ''}`}
            >
              <input 
                type="checkbox" 
                checked={item.completed || false}
                onChange={() => toggleStep(item.step_id)}
                className="checkbox"
              />
              <div className="item-details">
                <div className="item-header">
                  <h4 className="item-task">{item.task}</h4>
                  {item.priority === 'HIGH' && (
                    <span className="priority-badge high">HIGH PRIORITY</span>
                  )}
                </div>
                {item.legal_basis && (
                  <p className="legal-basis">📜 {item.legal_basis}</p>
                )}
                <div className="item-meta">
                  {item.deadline && (
                    <span className="deadline">⏰ Deadline: {item.deadline}</span>
                  )}
                  {item.dependencies && item.dependencies.length > 0 && (
                    <span className="dependencies">
                      🔗 Depends on: {item.dependencies.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Optional Best Practices */}
      {optionalSteps.length > 0 && (
        <div className="checklist-section">
          <h3 className="section-title">
            <span className="icon">✅</span>
            Recommended Best Practices ({optionalSteps.filter(s => s.completed).length}/{optionalSteps.length})
          </h3>
          {optionalSteps.map(item => (
            <div 
              key={item.step_id} 
              className={`checklist-item optional ${item.completed ? 'completed' : ''}`}
            >
              <input 
                type="checkbox" 
                checked={item.completed || false}
                onChange={() => toggleStep(item.step_id)}
                className="checkbox"
              />
              <div className="item-details">
                <h4 className="item-task">{item.task}</h4>
                {item.legal_basis && (
                  <p className="legal-basis">📜 {item.legal_basis}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          onClick={handleRegenerate} 
          className="regenerate-btn"
          disabled={regenerating}
        >
          {regenerating ? (
            <>
              <span className="spinner-small"></span>
              Regenerating...
            </>
          ) : (
            <>
              🔄 Regenerate Checklist with AI
            </>
          )}
        </button>
      </div>
    </div>
  );
}
