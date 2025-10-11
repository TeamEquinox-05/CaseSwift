const express = require('express');
const router = express.Router();
const Case = require('../models/Case');

// Create new case
router.post('/create', async (req, res) => {
  try {
    const caseData = req.body;
    const newCase = new Case(caseData);
    await newCase.save();

    res.json({
      success: true,
      message: 'Case created successfully',
      data: newCase
    });
  } catch (error) {
    console.error('Error creating case:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create case',
      error: error.message
    });
  }
});

// Get case by ID
router.get('/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findOne({ caseId })
      .populate('createdBy', 'name email badgeNumber')
      .populate('assignedTo', 'name email badgeNumber');

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    res.json({
      success: true,
      data: caseData
    });
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch case',
      error: error.message
    });
  }
});

// Update case
router.put('/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const updates = req.body;

    const updatedCase = await Case.findOneAndUpdate(
      { caseId },
      { $set: updates },
      { new: true }
    );

    if (!updatedCase) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    res.json({
      success: true,
      message: 'Case updated successfully',
      data: updatedCase
    });
  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update case',
      error: error.message
    });
  }
});

// Get all cases
router.get('/', async (req, res) => {
  try {
    const { status, type, officer } = req.query;
    const query = {};

    if (status) query.caseStatus = status;
    if (type) query.caseType = type;
    if (officer) query.createdBy = officer;

    const cases = await Case.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email badgeNumber');

    res.json({
      success: true,
      count: cases.length,
      data: cases
    });
  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cases',
      error: error.message
    });
  }
});

// Update case status
router.patch('/:caseId/status', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { status, performedBy } = req.body;

    const caseData = await Case.findOne({ caseId });
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    await caseData.updateStatus(status, performedBy);

    res.json({
      success: true,
      message: 'Case status updated',
      data: caseData
    });
  } catch (error) {
    console.error('Error updating case status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update case status',
      error: error.message
    });
  }
});

// Add evidence to case
router.post('/:caseId/evidence', async (req, res) => {
  try {
    const { caseId } = req.params;
    const evidenceItem = req.body;

    const caseData = await Case.findOne({ caseId });
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    await caseData.addEvidence(evidenceItem);

    res.json({
      success: true,
      message: 'Evidence added to case',
      data: caseData
    });
  } catch (error) {
    console.error('Error adding evidence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add evidence',
      error: error.message
    });
  }
});

// Mark case as complete
router.post('/:caseId/complete', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { firData } = req.body;

    const caseData = await Case.findOne({ caseId });
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    await caseData.markComplete(firData);

    res.json({
      success: true,
      message: 'Case marked as complete',
      data: caseData
    });
  } catch (error) {
    console.error('Error completing case:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete case',
      error: error.message
    });
  }
});

module.exports = router;
