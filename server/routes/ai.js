const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

const MOCK_DISEASES = [
  {
    crop: 'general',
    issues: ['Ukungu wa majani (Leaf Blight)', 'Kutu ya majani (Leaf Rust)'],
    confidence: 0.72,
    recommendation: 'Ondoa majani yaliyoathirika, panga mpangilio wa kumwagilia asubuhi, na tafuta ushauri wa mtaalamu wa kilimo wa eneo lako.',
    action: 'Njia bora: kunyunyizia dawa ya kuvu yenye kuthibitishwa na kudhibiti unyevunyevu.',
  },
  {
    crop: 'maize',
    cropLabel: 'Mahindi',
    issues: ['Kasoro ya Maggots ya shina', 'Ukungu wa majani ya mahindi (Northern Leaf Blight)'],
    confidence: 0.81,
    recommendation: 'Angalia mizizi na shina, tumia mbegu zilizoidhinishwa na mzunguko wa mazao ili kupunguza maambukizi.',
    action: 'Mwagilia kwa kiasi na epuka kumwagilia jioni.',
  },
  {
    crop: 'rice',
    cropLabel: 'Mpunga',
    issues: ['Dhara la Mchele (Rice Blast)', 'Brown Spot'],
    confidence: 0.79,
    recommendation: 'Dhibiti uwiano wa maji, punguza mbolea ya nitrojeni, na chagua aina za mpunga zinazostahimili magonjwa.',
    action: 'Fanya ufuatiliaji wa mara kwa mara na uondoe mabaki ya mazao.',
  },
  {
    crop: 'beans',
    cropLabel: 'Maharage',
    issues: ['Kutu ya Maharage (Bean Rust)', 'Angular Leaf Spot'],
    confidence: 0.76,
    recommendation: 'Tumia aina zinazostahimili kutu, na zoea mzunguko wa mazao kwa msimu mwingine.',
    action: 'Weka mbolea kwa uwiano na fuata ratiba ya ukaguzi kila wiki.',
  },
];

router.post('/crop-detect', auth, async (req, res) => {
  try {
    const { imageUrl, cropHint } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: 'URL ya picha inahitajika (pakia picha kwanza kwenye /upload)' });
    }

    // Vision API is optional. If not configured, fall back to a deterministic mock so the
    // feature is usable in development; wire VISION_API_URL/VISION_API_KEY for real results.
    if (process.env.VISION_API_URL && process.env.VISION_API_KEY) {
      try {
        const response = await fetch(process.env.VISION_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.VISION_API_KEY}`,
          },
          body: JSON.stringify({ imageUrl, cropHint }),
        });
        if (response.ok) {
          const data = await response.json();
          return res.json({
            detection: data.detection || data,
            source: 'vision_api',
            mocked: false,
          });
        }
      } catch (e) {
        console.error('[Vision API] Error:', e.message);
      }
    }

    const candidate = MOCK_DISEASES.find(d => d.crop === (cropHint || '').toLowerCase().trim())
      || MOCK_DISEASES[0];

    res.json({
      detection: {
        crop: candidate.cropLabel || 'Zao lisilojulikana',
        issues: candidate.issues,
        recommendation: candidate.recommendation,
        action: candidate.action,
        confidence: candidate.confidence,
        note: 'Uchambuzi huu ni wa majaribio (mock) — pata uthibitisho kwa mtaalamu wa kilimo.',
      },
      source: 'mock',
      mocked: true,
    });
  } catch (error) {
    console.error('Crop detect error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;