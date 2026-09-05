const LandGuidance = require('../models/LandGuidance');
const CropCycle = require('../models/CropCycle');
const CropDisease = require('../models/CropDisease');

// ---- Land guidance (soil/ward suitability) ----

exports.getLandGuidance = async (req, res) => {
  try {
    const { district, ward } = req.query;
    const query = {};
    if (district) query.district = district;
    if (ward) query.ward = ward;
    const items = await LandGuidance.find(query).sort({ district: 1, ward: 1 });
    res.json(items);
  } catch (e) {
    console.error('Admin land guidance list error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.createLandGuidance = async (req, res) => {
  try {
    const { district, ward, soilType, suitableCrops, notes } = req.body;
    if (!district || !ward) return res.status(400).json({ message: 'Wilaya na kata zinahitajika' });
    const item = await LandGuidance.create({
      district, ward, soilType,
      suitableCrops: Array.isArray(suitableCrops) ? suitableCrops.filter(Boolean) : [],
      notes, createdBy: req.user._id,
    });
    res.status(201).json(item);
  } catch (e) {
    console.error('Admin create land guidance error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.updateLandGuidance = async (req, res) => {
  try {
    const item = await LandGuidance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Rekodi haipatikani' });
    res.json(item);
  } catch (e) {
    console.error('Admin update land guidance error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.deleteLandGuidance = async (req, res) => {
  try {
    const item = await LandGuidance.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Rekodi haipatikani' });
    res.json({ message: 'Rekodi imefutwa' });
  } catch (e) {
    console.error('Admin delete land guidance error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

// ---- Crop cycle ----

exports.getCropCycles = async (req, res) => {
  try {
    const items = await CropCycle.find().sort({ cropName: 1 });
    res.json(items);
  } catch (e) {
    console.error('Admin crop cycle list error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.upsertCropCycle = async (req, res) => {
  try {
    const { cropName, stages } = req.body;
    if (!cropName) return res.status(400).json({ message: 'Jina la zao linahitajika' });
    const item = await CropCycle.findOneAndUpdate(
      { cropName },
      { cropName, stages: Array.isArray(stages) ? stages : [], createdBy: req.user._id },
      { upsert: true, new: true }
    );
    res.status(200).json(item);
  } catch (e) {
    console.error('Admin upsert crop cycle error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.deleteCropCycle = async (req, res) => {
  try {
    const item = await CropCycle.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Sajili haipatikani' });
    res.json({ message: 'Sajili imefutwa' });
  } catch (e) {
    console.error('Admin delete crop cycle error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

// ---- Disease library ----

exports.getDiseases = async (req, res) => {
  try {
    const { cropName } = req.query;
    const query = cropName ? { cropName } : {};
    const items = await CropDisease.find(query).sort({ cropName: 1, severity: 1 });
    res.json(items);
  } catch (e) {
    console.error('Admin disease list error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.createDisease = async (req, res) => {
  try {
    const { cropName, name, symptoms, prevention, treatment, severity } = req.body;
    if (!cropName || !name) return res.status(400).json({ message: 'Jina la zao na ugonjwa vinahitajika' });
    const item = await CropDisease.create({ cropName, name, symptoms, prevention, treatment, severity });
    res.status(201).json(item);
  } catch (e) {
    console.error('Admin create disease error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.updateDisease = async (req, res) => {
  try {
    const item = await CropDisease.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Ugonjwa haupatikani' });
    res.json(item);
  } catch (e) {
    console.error('Admin update disease error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.deleteDisease = async (req, res) => {
  try {
    const item = await CropDisease.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Ugonjwa haupatikani' });
    res.json({ message: 'Ugonjwa umefutwa' });
  } catch (e) {
    console.error('Admin delete disease error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};