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

const DETECTION_PROMPT = `Wewe ni mtaalamu wa kutambua magonjwa ya mazao (crop diseases) kwa wakulima wadogo wa Tanzania.
Chambua picha ya zao/majani uliyopewa. Jibu kwa JSON PEKEE (hakuna maandishi mengine), muundo huu Halisi:
{"crop":"msingi-wa-latini","cropLabel":"Jina la zao kwa Kiswahili","issues":["magonjwa yanayoshukiwa"],"recommendation":"ushauri kwa Kiswahili rahisi","action":"hatua ya hatimaye kwa Kiswahili rahisi","confidence":"0.00 mpaka 1.00"}
Usijumuishe triple backticks wala maneno kabla au baada ya JSON.`;

function parseModelJson(text) {
  const raw = String(text || '').trim();
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function normalizeDetection(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  return {
    crop: parsed.crop || parsed.cropName || 'general',
    cropLabel: parsed.cropLabel || parsed.crop_label || 'Zao',
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    recommendation: parsed.recommendation || '',
    action: parsed.action || '',
    confidence: Number(parsed.confidence) || 0.7,
  };
}

async function fetchImageBase64(imageUrl) {
  if (imageUrl.startsWith('data:')) {
    const m = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (m) return { mimeType: m[1], base64: m[2] };
    throw new Error('Data URL isiyo sahihi');
  }
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Imeshindwa kupakua picha: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { mimeType: res.headers.get('content-type') || 'image/jpeg', base64: buf.toString('base64') };
}

async function visionViaOpenRouter(imageUrl, cropHint) {
  const model = process.env.VISION_MODEL || 'google/gemini-2.5-flash';
  const response = await fetch(process.env.VISION_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VISION_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `${DETECTION_PROMPT}\nMaelekezo ya zao (kama yanapatikana): ${cropHint || 'hakuna'}` },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 1024,
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter: HTTP ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const text = Array.isArray(content) ? content.map(c => c.text || '').join('') : content;
  const parsed = parseModelJson(text);
  const detection = normalizeDetection(parsed);
  if (!detection) throw new Error('OpenRouter: JSON haujatambulika');
  return { detection, source: 'vision_api_openrouter', mocked: false };
}

async function visionViaGemini(imageUrl, cropHint) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VISION_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const baseUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta';
  const { mimeType, base64 } = await fetchImageBase64(imageUrl);
  const response = await fetch(`${baseUrl}/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${DETECTION_PROMPT}\nMaelekezo ya zao (kama yanapatikana): ${cropHint || 'hakuna'}` },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    }),
  });
  if (!response.ok) throw new Error(`Gemini: HTTP ${response.status}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  const parsed = parseModelJson(text);
  const detection = normalizeDetection(parsed);
  if (!detection) throw new Error('Gemini: JSON haujatambulika');
  return { detection, source: 'vision_api_gemini', mocked: false };
}

async function visionViaGeneric(imageUrl, cropHint) {
  const response = await fetch(process.env.VISION_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VISION_API_KEY}`,
    },
    body: JSON.stringify({ imageUrl, cropHint }),
  });
  if (!response.ok) throw new Error(`Vision API: HTTP ${response.status}`);
  const data = await response.json();
  const payload = data.detection || data;
  const detection = normalizeDetection(payload);
  if (!detection) throw new Error('Vision API: JSON haujatambulika');
  return { detection, source: 'vision_api', mocked: false };
}

router.post('/crop-detect', auth, async (req, res) => {
  try {
    const { imageUrl, cropHint } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: 'URL ya picha inahitajika (pakia picha kwanza kwenye /upload)' });
    }

    const hasOpenAI = process.env.VISION_API_URL && process.env.VISION_API_KEY;

    const strategies = [];
    if (hasOpenAI && /chat\/completions|openrouter|api\.openai/i.test(process.env.VISION_API_URL)) {
      strategies.push(() => visionViaOpenRouter(imageUrl, cropHint));
    }
    if (hasOpenAI && /generativelanguage|generativeresponse/i.test(process.env.VISION_API_URL)) {
      strategies.push(() => visionViaGemini(imageUrl, cropHint));
    }
    if (process.env.GEMINI_API_KEY) {
      strategies.push(() => visionViaGemini(imageUrl, cropHint));
    }
    if (hasOpenAI) {
      strategies.push(() => visionViaGeneric(imageUrl, cropHint));
    }

    for (const run of strategies) {
      try {
        const result = await run();
        return res.json(result);
      } catch (e) {
        console.error('[Vision API] Skip ->', e.message);
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