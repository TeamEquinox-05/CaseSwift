const express = require('express');
const router = express.Router();
const ConversationalCase = require('../models/ConversationalCase');

// Create new conversational session
router.post('/create', async (req, res) => {
  try {
    const { caseId, sessionId, initialData, officerName, department } = req.body;

    const conversationalCase = new ConversationalCase({
      caseId,
      sessionId,
      initialData,
      officerName,
      department
    });

    await conversationalCase.save();

    res.json({
      success: true,
      message: 'Conversational session created',
      data: conversationalCase
    });
  } catch (error) {
    console.error('Error creating conversational session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversational session',
      error: error.message
    });
  }
});

// Save conversation progress (after each Q&A)
router.post('/save', async (req, res) => {
  try {
    const { caseId, sessionId, conversationHistory, extractedData, progress } = req.body;

    const conversationalCase = await ConversationalCase.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          conversationHistory,
          extractedData,
          progress,
          updatedAt: new Date()
        }
      },
      { 
        upsert: true, // Create if doesn't exist
        new: true,    // Return updated document
        setDefaultsOnInsert: true
      }
    );

    res.json({
      success: true,
      message: 'Conversation saved',
      data: {
        sessionId: conversationalCase.sessionId,
        messageCount: conversationalCase.conversationHistory.length,
        progress: conversationalCase.progress
      }
    });
  } catch (error) {
    console.error('Error saving conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save conversation',
      error: error.message
    });
  }
});

// Get conversation by session ID
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const conversation = await ConversationalCase.findOne({ sessionId });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation',
      error: error.message
    });
  }
});

// Get all conversations for a case
router.get('/case/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;

    const conversations = await ConversationalCase.find({ caseId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (error) {
    console.error('Error fetching case conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch case conversations',
      error: error.message
    });
  }
});

// Mark conversation as complete and save structured data
router.put('/complete/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { sessionId, structuredCaseData } = req.body;

    const conversation = await ConversationalCase.findOne({ 
      caseId, 
      sessionId 
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    await conversation.markComplete(structuredCaseData);

    res.json({
      success: true,
      message: 'Conversation marked as complete',
      data: {
        caseId: conversation.caseId,
        sessionId: conversation.sessionId,
        completedAt: conversation.completedAt,
        isComplete: conversation.isComplete
      }
    });
  } catch (error) {
    console.error('Error completing conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete conversation',
      error: error.message
    });
  }
});

// Get recent conversations
router.get('/recent/:limit?', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 10;

    const conversations = await ConversationalCase.getRecent(limit);

    res.json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (error) {
    console.error('Error fetching recent conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent conversations',
      error: error.message
    });
  }
});

// Get statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalConversations = await ConversationalCase.countDocuments();
    const completedConversations = await ConversationalCase.countDocuments({ isComplete: true });
    const activeConversations = await ConversationalCase.countDocuments({ isComplete: false });

    // Get average messages per conversation
    const conversations = await ConversationalCase.find();
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.conversationHistory.length, 0);
    const avgMessagesPerConv = totalConversations > 0 ? (totalMessages / totalConversations).toFixed(1) : 0;

    res.json({
      success: true,
      stats: {
        totalConversations,
        completedConversations,
        activeConversations,
        avgMessagesPerConversation: parseFloat(avgMessagesPerConv)
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Delete conversation (for testing/cleanup)
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await ConversationalCase.findOneAndDelete({ sessionId });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      message: 'Conversation deleted',
      data: {
        sessionId: result.sessionId,
        caseId: result.caseId
      }
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
      error: error.message
    });
  }
});

module.exports = router;
