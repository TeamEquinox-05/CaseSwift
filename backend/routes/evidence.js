const express = require('express');
const router = express.Router();
const Evidence = require('../models/Evidence');

// Create new evidence
router.post('/create', async (req, res) => {
  try {
    const evidenceData = req.body;
    const evidence = new Evidence(evidenceData);
    await evidence.save();

    res.json({
      success: true,
      message: 'Evidence added successfully',
      data: evidence
    });
  } catch (error) {
    console.error('Error creating evidence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add evidence',
      error: error.message
    });
  }
});

// Get evidence for a case
router.get('/case/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const evidence = await Evidence.getByCaseId(caseId);

    res.json({
      success: true,
      count: evidence.length,
      data: evidence
    });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch evidence',
      error: error.message
    });
  }
});

// Get evidence by ID
router.get('/:evidenceId', async (req, res) => {
  try {
    const evidence = await Evidence.findOne({ evidenceId: req.params.evidenceId })
      .populate('collectedBy', 'name email badgeNumber')
      .populate('currentCustodian', 'name email');

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    res.json({
      success: true,
      data: evidence
    });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch evidence',
      error: error.message
    });
  }
});

// Update evidence
router.put('/:evidenceId', async (req, res) => {
  try {
    const evidence = await Evidence.findOneAndUpdate(
      { evidenceId: req.params.evidenceId },
      { $set: req.body },
      { new: true }
    );

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    res.json({
      success: true,
      message: 'Evidence updated',
      data: evidence
    });
  } catch (error) {
    console.error('Error updating evidence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update evidence',
      error: error.message
    });
  }
});

// Transfer custody
router.post('/:evidenceId/transfer', async (req, res) => {
  try {
    const { fromPerson, toPerson, purpose, condition } = req.body;
    const evidence = await Evidence.findOne({ evidenceId: req.params.evidenceId });

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    await evidence.transferCustody(fromPerson, toPerson, purpose, condition);

    res.json({
      success: true,
      message: 'Custody transferred',
      data: evidence
    });
  } catch (error) {
    console.error('Error transferring custody:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transfer custody',
      error: error.message
    });
  }
});

// Send for forensics
router.post('/:evidenceId/forensics', async (req, res) => {
  try {
    const { labName, examType } = req.body;
    const evidence = await Evidence.findOne({ evidenceId: req.params.evidenceId });

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    await evidence.sendForForensics(labName, examType);

    res.json({
      success: true,
      message: 'Evidence sent for forensic examination',
      data: evidence
    });
  } catch (error) {
    console.error('Error sending evidence for forensics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send evidence for forensics',
      error: error.message
    });
  }
});

// Record forensic report
router.post('/:evidenceId/forensic-report', async (req, res) => {
  try {
    const { reportUrl, findings } = req.body;
    const evidence = await Evidence.findOne({ evidenceId: req.params.evidenceId });

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    await evidence.recordForensicReport(reportUrl, findings);

    res.json({
      success: true,
      message: 'Forensic report recorded',
      data: evidence
    });
  } catch (error) {
    console.error('Error recording forensic report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record forensic report',
      error: error.message
    });
  }
});

// Get pending forensics
router.get('/status/pending-forensics', async (req, res) => {
  try {
    const evidence = await Evidence.getPendingForensics();

    res.json({
      success: true,
      count: evidence.length,
      data: evidence
    });
  } catch (error) {
    console.error('Error fetching pending forensics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending forensics',
      error: error.message
    });
  }
});

module.exports = router;
