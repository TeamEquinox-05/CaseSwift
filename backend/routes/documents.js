const express = require('express');
const router = express.Router();
const Document = require('../models/Document');

// Create/Upload new document
router.post('/create', async (req, res) => {
  try {
    const documentData = req.body;
    const document = new Document(documentData);
    await document.save();

    res.json({
      success: true,
      message: 'Document added successfully',
      data: document
    });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add document',
      error: error.message
    });
  }
});

// Get documents for a case
router.get('/case/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { type } = req.query;

    let query = { caseId };
    if (type) query.documentType = type;

    const documents = await Document.find(query)
      .sort({ uploadedAt: -1 })
      .populate('uploadedBy', 'name email badgeNumber');

    res.json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message
    });
  }
});

// Get document by ID
router.get('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email badgeNumber')
      .populate('approvedBy', 'name email');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document',
      error: error.message
    });
  }
});

// Update document
router.put('/:id', async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      message: 'Document updated',
      data: document
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document',
      error: error.message
    });
  }
});

// Approve document
router.post('/:id/approve', async (req, res) => {
  try {
    const { approver, notes } = req.body;
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    await document.approve(approver, notes);

    res.json({
      success: true,
      message: 'Document approved',
      data: document
    });
  } catch (error) {
    console.error('Error approving document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve document',
      error: error.message
    });
  }
});

// Submit document to court
router.post('/:id/submit-court', async (req, res) => {
  try {
    const { courtName, acknowledgementNumber } = req.body;
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    await document.submitToCourt(courtName, acknowledgementNumber);

    res.json({
      success: true,
      message: 'Document submitted to court',
      data: document
    });
  } catch (error) {
    console.error('Error submitting document to court:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit document to court',
      error: error.message
    });
  }
});

// Get pending approval documents
router.get('/status/pending-approval', async (req, res) => {
  try {
    const documents = await Document.getPendingApproval();

    res.json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    console.error('Error fetching pending documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending documents',
      error: error.message
    });
  }
});

// Get recent FIRs
router.get('/type/fir/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const firs = await Document.getRecentFIRs(limit);

    res.json({
      success: true,
      count: firs.length,
      data: firs
    });
  } catch (error) {
    console.error('Error fetching recent FIRs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent FIRs',
      error: error.message
    });
  }
});

module.exports = router;
