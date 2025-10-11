const express = require('express');
const router = express.Router();
const Witness = require('../models/Witness');

// Create new witness
router.post('/create', async (req, res) => {
  try {
    const witnessData = req.body;
    const witness = new Witness(witnessData);
    await witness.save();

    res.json({
      success: true,
      message: 'Witness added successfully',
      data: witness
    });
  } catch (error) {
    console.error('Error creating witness:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add witness',
      error: error.message
    });
  }
});

// Get witnesses for a case
router.get('/case/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const witnesses = await Witness.getByCaseId(caseId);

    res.json({
      success: true,
      count: witnesses.length,
      data: witnesses
    });
  } catch (error) {
    console.error('Error fetching witnesses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch witnesses',
      error: error.message
    });
  }
});

// Get witness by ID
router.get('/:id', async (req, res) => {
  try {
    const witness = await Witness.findById(req.params.id)
      .populate('addedBy', 'name email');

    if (!witness) {
      return res.status(404).json({
        success: false,
        message: 'Witness not found'
      });
    }

    res.json({
      success: true,
      data: witness
    });
  } catch (error) {
    console.error('Error fetching witness:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch witness',
      error: error.message
    });
  }
});

// Update witness
router.put('/:id', async (req, res) => {
  try {
    const witness = await Witness.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!witness) {
      return res.status(404).json({
        success: false,
        message: 'Witness not found'
      });
    }

    res.json({
      success: true,
      message: 'Witness updated',
      data: witness
    });
  } catch (error) {
    console.error('Error updating witness:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update witness',
      error: error.message
    });
  }
});

// Record witness statement
router.post('/:id/statement', async (req, res) => {
  try {
    const { statement, recordedBy } = req.body;
    const witness = await Witness.findById(req.params.id);

    if (!witness) {
      return res.status(404).json({
        success: false,
        message: 'Witness not found'
      });
    }

    await witness.recordStatement(statement, recordedBy);

    res.json({
      success: true,
      message: 'Statement recorded',
      data: witness
    });
  } catch (error) {
    console.error('Error recording statement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record statement',
      error: error.message
    });
  }
});

// Update witness status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, performedBy, details } = req.body;
    const witness = await Witness.findById(req.params.id);

    if (!witness) {
      return res.status(404).json({
        success: false,
        message: 'Witness not found'
      });
    }

    await witness.updateStatus(status, performedBy, details);

    res.json({
      success: true,
      message: 'Witness status updated',
      data: witness
    });
  } catch (error) {
    console.error('Error updating witness status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update witness status',
      error: error.message
    });
  }
});

// Get court witnesses for a case
router.get('/case/:caseId/court', async (req, res) => {
  try {
    const { caseId } = req.params;
    const witnesses = await Witness.getCourtWitnesses(caseId);

    res.json({
      success: true,
      count: witnesses.length,
      data: witnesses
    });
  } catch (error) {
    console.error('Error fetching court witnesses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch court witnesses',
      error: error.message
    });
  }
});

module.exports = router;
