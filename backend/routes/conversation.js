const express = require('express');
const router = express.Router();
const ConversationalCase = require('../models/ConversationalCase');
const Case = require('../models/Case');
const Conversation = require('../models/Conversation');

// Create new conversational session WITH case in database
router.post('/create-with-case', async (req, res) => {
  try {
    const { caseId, sessionId, initialData, officerName, department, userId } = req.body;

    // 1. Create the main Case in cases collection
    const newCase = new Case({
      caseId: caseId,
      caseTitle: initialData.caseTitle,
      caseType: initialData.caseType || 'Other',
      caseStatus: 'Draft',
      priority: 'Medium',
      
      // Victim info from initial form
      victim: {
        age: initialData.victimAge,
        gender: initialData.victimGender,
        address: initialData.victimLocation
      },
      
      // Incident details
      incident: {
        description: initialData.caseDescription || initialData.initialDescription,
        date: initialData.incidentDate,
        location: initialData.location || initialData.victimLocation
      },
      
      // Officer details
      createdBy: userId || null,
      policeStation: department,
      
      // Link to conversation
      conversationSessionId: sessionId
    });

    await newCase.save();
    console.log(`✅ Case ${caseId} created in cases collection`);

    // 2. Create Conversation in conversations collection
    const newConversation = new Conversation({
      sessionId: sessionId,
      caseId: caseId,
      caseRef: newCase._id,
      initialData: initialData,
      startedBy: userId || null
    });

    await newConversation.save();
    console.log(`✅ Conversation ${sessionId} created in conversations collection`);

    // 3. Also create in old conversationalcases for backward compatibility
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
      message: 'Case and conversation session created',
      data: {
        case: newCase,
        conversation: newConversation,
        legacySession: conversationalCase
      }
    });
  } catch (error) {
    console.error('Error creating case and conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create case and conversation',
      error: error.message
    });
  }
});

// Create new conversational session (legacy endpoint)
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

    console.log(`\n💾 Saving conversation for case ${caseId}, session ${sessionId}`);
    console.log(`📊 Progress:`, progress);
    console.log(`📝 Extracted data fields:`, Object.keys(extractedData || {}));
    console.log(`💬 Total messages:`, conversationHistory?.length || 0);

    // 1. Update ConversationalCase (legacy)
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

    // 2. Update Conversation in new schema (or create if doesn't exist)
    let conversation = await Conversation.findOne({ sessionId });
    
    if (conversation) {
      // Update existing conversation
      conversation.extractedData = extractedData;
      conversation.progress = progress;
      conversation.lastActiveAt = new Date();
      
      // Only add the latest message if it's new (avoid duplicates)
      const latestMessage = conversationHistory.slice(-1)[0];
      if (latestMessage && !conversation.messages.find(m => 
        m.timestamp === latestMessage.timestamp && m.content === latestMessage.content
      )) {
        conversation.messages.push(latestMessage);
      }
      
      await conversation.save();
    } else {
      // Create new conversation if doesn't exist
      conversation = new Conversation({
        sessionId,
        caseId,
        initialData: {},
        messages: conversationHistory,
        extractedData,
        progress
      });
      await conversation.save();
      console.log(`✅ New conversation ${sessionId} created`);
    }

    // 3. Update the main Case with extracted data
    if (extractedData && Object.keys(extractedData).length > 0) {
      const updateData = {};
      
      // Map extracted data to Case schema fields
      if (extractedData.victim_name) updateData['victim.name'] = extractedData.victim_name;
      if (extractedData.victim_age) updateData['victim.age'] = extractedData.victim_age;
      if (extractedData.victim_gender) updateData['victim.gender'] = extractedData.victim_gender;
      if (extractedData.victim_address) updateData['victim.address'] = extractedData.victim_address;
      if (extractedData.victim_contact) updateData['victim.contactNumber'] = extractedData.victim_contact;
      if (extractedData.victim_occupation) updateData['victim.occupation'] = extractedData.victim_occupation;
      
      if (extractedData.accused_name) updateData['accused.name'] = extractedData.accused_name;
      if (extractedData.accused_age) updateData['accused.age'] = extractedData.accused_age;
      if (extractedData.accused_gender) updateData['accused.gender'] = extractedData.accused_gender;
      if (extractedData.accused_address) updateData['accused.address'] = extractedData.accused_address;
      if (extractedData.relation_to_victim) updateData['victim.relationToAccused'] = extractedData.relation_to_victim;
      
      if (extractedData.incident_description) updateData['incident.description'] = extractedData.incident_description;
      if (extractedData.incident_date) updateData['incident.date'] = extractedData.incident_date;
      if (extractedData.incident_time) updateData['incident.time'] = extractedData.incident_time;
      if (extractedData.incident_location) updateData['incident.location'] = extractedData.incident_location;
      
      if (extractedData.medical_exam_status) {
        updateData['medicalExam.status'] = extractedData.medical_exam_status;
      }
      if (extractedData.medical_findings) {
        updateData['medicalExam.findings'] = extractedData.medical_findings;
      }
      
      if (extractedData.witness_names) {
        updateData['incident.witnesses'] = extractedData.witness_names.split(',').map(w => w.trim());
      }

      // Only update if we have data to update
      if (Object.keys(updateData).length > 0) {
        const updatedCase = await Case.findOneAndUpdate(
          { caseId },
          { $set: updateData },
          { new: true }
        );
        
        if (updatedCase) {
          console.log(`✅ Case ${caseId} updated with extracted data:`, Object.keys(updateData));
        } else {
          console.log(`⚠️ Case ${caseId} not found in database, will be created when conversation completes`);
        }
      }
    }

    res.json({
      success: true,
      message: 'Conversation saved',
      data: {
        sessionId: conversationalCase.sessionId,
        messageCount: conversationalCase.conversationHistory.length,
        progress: conversationalCase.progress,
        extractedFieldsCount: Object.keys(extractedData || {}).length,
        savedToCollections: ['conversationalcases', 'conversations', 'cases']
      }
    });
    
    console.log(`✅ Successfully saved conversation to all collections\n`);
  } catch (error) {
    console.error('❌ Error saving conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save conversation',
      error: error.message
    });
  }
});

// Pause conversation (when user skips)
router.post('/pause', async (req, res) => {
  try {
    const { caseId, sessionId } = req.body;
    
    console.log(`⏸️ Pausing conversation: ${sessionId}`);
    
    // Update Conversation state to 'paused'
    const conversation = await Conversation.findOne({ sessionId });
    if (conversation) {
      conversation.conversationState = 'paused';
      conversation.lastActiveAt = new Date();
      await conversation.save();
      console.log(`✅ Conversation ${sessionId} paused in conversations collection`);
    }
    
    // Update ConversationalCase
    const conversationalCase = await ConversationalCase.findOne({ sessionId });
    if (conversationalCase) {
      conversationalCase.isComplete = false; // Mark as incomplete
      conversationalCase.updatedAt = new Date();
      await conversationalCase.save();
      console.log(`✅ ConversationalCase ${sessionId} marked as paused`);
    }
    
    res.json({
      success: true,
      message: 'Conversation paused successfully',
      sessionId,
      caseId
    });
  } catch (error) {
    console.error('❌ Error pausing conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause conversation',
      error: error.message
    });
  }
});

// Resume conversation (when user clicks from sidebar)
router.post('/resume', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    console.log(`▶️ Resuming conversation: ${sessionId}`);
    
    // Update Conversation state to 'active'
    const conversation = await Conversation.findOne({ sessionId });
    if (conversation) {
      conversation.conversationState = 'active';
      conversation.lastActiveAt = new Date();
      await conversation.save();
      console.log(`✅ Conversation ${sessionId} resumed`);
    }
    
    res.json({
      success: true,
      message: 'Conversation resumed successfully',
      sessionId
    });
  } catch (error) {
    console.error('❌ Error resuming conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume conversation',
      error: error.message
    });
  }
});

// Get paused/active conversations for sidebar
router.get('/paused-conversations', async (req, res) => {
  try {
    // Get all paused or active conversations from Conversation collection
    const pausedConversations = await Conversation.find({
      conversationState: { $in: ['paused', 'active'] }
    })
    .populate('caseRef', 'caseTitle caseType victim')
    .sort({ lastActiveAt: -1 })
    .limit(10);
    
    res.json({
      success: true,
      count: pausedConversations.length,
      conversations: pausedConversations.map(conv => ({
        sessionId: conv.sessionId,
        caseId: conv.caseId,
        caseTitle: conv.caseRef?.caseTitle || conv.initialData?.caseTitle || 'Untitled Case',
        caseType: conv.caseRef?.caseType || conv.initialData?.caseType || 'Unknown',
        progress: conv.progress,
        overallProgress: conv.overallProgress,
        messageCount: conv.messages.length,
        lastActiveAt: conv.lastActiveAt,
        conversationState: conv.conversationState
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching paused conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch paused conversations',
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
