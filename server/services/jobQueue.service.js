const JobTask = require('../models/JobTask');
const GeneratedDocument = require('../models/GeneratedDocument');
const { buildPdf } = require('./pdf.service');

const BACKOFF_BASE_MS = 60000;
const BACKOFF_MAX_MS = 3600000;

// Retry delay grows 1m, 2m, 4m... capped at one hour.
const nextAttemptDelay = (failedAttempts) => Math.min(
  BACKOFF_BASE_MS * 2 ** Math.max(failedAttempts - 1, 0),
  BACKOFF_MAX_MS,
);

const canRetry = (job = {}) => (job.attempts || 0) < (job.maxAttempts || 3);

const summarizeJobs = (jobs = []) => {
  const counts = { queued: 0, running: 0, completed: 0, failed: 0 };
  for (const job of jobs) {
    if (counts[job.status] !== undefined) counts[job.status] += 1;
  }
  return { ...counts, total: jobs.length };
};

const handlers = new Map();

const registerHandler = (type, handler) => {
  handlers.set(String(type), handler);
};

const enqueue = async ({ type, payload = {}, runAt = new Date(), createdBy = null, maxAttempts = 3 }) => JobTask.create({
  type,
  payload,
  runAt,
  createdBy,
  maxAttempts,
});

// Claims one due job atomically so two workers never run the same task.
const processNext = async () => {
  const now = new Date();
  const job = await JobTask.findOneAndUpdate(
    { status: 'queued', runAt: { $lte: now } },
    { $set: { status: 'running', startedAt: now } },
    { sort: { runAt: 1 }, new: true },
  );
  if (!job) return null;

  const handler = handlers.get(job.type);
  try {
    if (!handler) throw new Error(`Hakuna kichakataji cha aina "${job.type}"`);
    const result = await handler(job.payload || {}, job);
    job.status = 'completed';
    job.completedAt = new Date();
    job.result = result || {};
    job.lastError = '';
    await job.save();
  } catch (error) {
    const attempts = (job.attempts || 0) + 1;
    job.attempts = attempts;
    job.lastError = String(error.message || error).slice(0, 1000);
    if (attempts >= job.maxAttempts) {
      job.status = 'failed';
      job.completedAt = new Date();
    } else {
      job.status = 'queued';
      job.runAt = new Date(Date.now() + nextAttemptDelay(attempts));
    }
    await job.save();
  }
  return job;
};

let timer = null;
let busy = false;

const tick = async () => {
  if (busy) return;
  busy = true;
  try {
    for (let i = 0; i < 5; i += 1) {
      const job = await processNext();
      if (!job) break;
    }
  } catch (error) {
    console.error('[jobs] worker tick failed:', error.message);
  } finally {
    busy = false;
  }
};

const startWorker = ({ intervalMs = 5000 } = {}) => {
  if (timer) return timer;
  timer = setInterval(tick, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
};

const stopWorker = () => {
  if (timer) clearInterval(timer);
  timer = null;
};

registerHandler('pdf', async (payload = {}, job) => {
  if (!payload.ownerId || !Array.isArray(payload.lines)) {
    throw new Error('PDF inahitaji ownerId na mistari ya maandishi');
  }
  const buffer = buildPdf({ title: payload.title || 'Katavi E-Kilimo', lines: payload.lines });
  const document = await GeneratedDocument.create({
    owner: payload.ownerId,
    type: payload.documentType || 'pdf',
    title: String(payload.title || '').slice(0, 200),
    filename: String(payload.filename || 'nyaraka.pdf').slice(0, 200),
    size: buffer.length,
    data: buffer,
    job: job?._id || null,
  });
  return { documentId: String(document._id), size: buffer.length };
});

module.exports = {
  nextAttemptDelay,
  canRetry,
  summarizeJobs,
  registerHandler,
  enqueue,
  processNext,
  startWorker,
  stopWorker,
};
