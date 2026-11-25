const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const JobTask = require('../models/JobTask');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const { summarizeJobs } = require('../services/jobQueue.service');

// GET /api/v1/jobs/my — background tasks the caller queued
router.get('/my', auth, async (req, res) => {
  try {
    const jobs = await JobTask.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(jobs);
  } catch (error) {
    console.error('My jobs error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/jobs?status= — operations view of the queue
router.get('/', requireRole('admin', 'support'), async (req, res) => {
  try {
    const filter = {};
    if (['queued', 'running', 'completed', 'failed'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const jobs = await JobTask.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ items: jobs, summary: summarizeJobs(jobs) });
  } catch (error) {
    console.error('List jobs error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/jobs/:id/retry — requeue a failed task
router.post('/:id/retry', requireRole('admin', 'support'), auditRoute({
  action: 'retry_job_task',
  category: 'system',
  targetType: 'JobTask',
}), async (req, res) => {
  try {
    const job = mongoose.isValidObjectId(req.params.id)
      ? await JobTask.findById(req.params.id)
      : null;
    if (!job) return res.status(404).json({ message: 'Kazi haipatikani' });
    if (job.status !== 'failed') {
      return res.status(400).json({ message: 'Kazi zilizofeli pekee zinaweza kurudi kwenye foleni' });
    }

    job.status = 'queued';
    job.attempts = 0;
    job.lastError = '';
    job.runAt = new Date();
    job.startedAt = null;
    job.completedAt = null;
    await job.save();

    res.json(job);
  } catch (error) {
    console.error('Retry job error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
