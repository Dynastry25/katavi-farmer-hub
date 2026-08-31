const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const NodeCache = require('node-cache');
const buildSystemPrompt = require('../config/chatbotSystemPrompt');
const Crop = require('../models/Crop');
const Supplier = require('../models/Supplier');
const Loan = require('../models/Loan');
const AdviceArticle = require('../models/AdviceArticle');
const NewsArticle = require('../models/NewsArticle');
const FarmerGroup = require('../models/FarmerGroup');
const Video = require('../models/Video');
const Expert = require('../models/Expert');
const Announcement = require('../models/Announcement');

const apiKey = process.env.GROQ_API_KEY;
const client = apiKey && apiKey !== 'your_groq_api_key_here'
  ? new Groq({ apiKey })
  : null;

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

function getCurrentSeason(date) {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'Masika (Machi-Mei) - Msimu wa mvua nyingi, wakati mkuu wa kupanda';
  if (month >= 10 && month <= 12) return 'Vuli (Oktoba-Desemba) - Mvua ndogo, kupanda mazao ya mfupi';
  if (month === 1 || month === 2) return 'MSMS (Januari-Februari) - Msimu mfupi wa masika';
  return 'Kiangazi ( Juni-Sebtema) - Msimu kavu, hakuna mvua, weka mbegu na plan mfupi';
}

function extractFarmWords(text) {
  const keywords = {
    crop: ['mahindi', 'mpunga', 'maharage', 'karanga', 'viazi', 'alizeti', 'tumbaku', 'machungwa', 'ndizi', 'mboga', 'mazao', 'crop', 'maize', 'rice', 'beans', 'groundnut', 'potato', 'sunflower'],
    supplier: ['mbolea', 'mbegu', 'dawa', 'pembejeo', 'mifugo', 'supplier', 'fertilizer', 'seed', 'pesticide'],
    loan: ['mikopo', 'loan', 'mkopo', 'fedha', 'money', 'microfinance'],
    group: ['vikundi', 'kikundi', 'group', 'cooperative', 'association', 'chama'],
    expert: ['mtaalamu', 'expert', 'ushauri', 'advice', 'extension'],
    news: ['habari', 'news', 'taarifa'],
    weather: ['hali ya hewa', 'mvua', 'jua', 'ukame', 'weather', 'vuli', 'masika', 'msim'],
    advice: ['ushauri', 'advice', 'njia', 'mbinu', 'jinsi']
  };
  const q = (text || '').toLowerCase();
  const found = {};
  for (const [key, words] of Object.entries(keywords)) {
    if (words.some(w => q.includes(w))) found[key] = true;
  }
  return found;
}

async function gatherContext(userMessage) {
  const topics = extractFarmWords(userMessage);
  const context = {};

  if (topics.crop) {
    const cached = cache.get('crops_context');
    if (cached) {
      context.crops = cached;
    } else {
      const crops = await Crop.find().limit(8).select('name category price quantity location farmerName description').lean();
      const data = crops.map(c => ({ name: c.name, category: c.category, price: `${c.price}/kg`, quantity: c.quantity, location: c.location, farmer: c.farmerName, description: c.description }));
      cache.set('crops_context', data);
      context.crops = data;
    }
  }

  if (topics.supplier) {
    const cached = cache.get('suppliers_context');
    if (cached) {
      context.suppliers = cached;
    } else {
      const suppliers = await Supplier.find().limit(5).select('name category location products delivery verified').lean();
      cache.set('suppliers_context', suppliers);
      context.suppliers = suppliers;
    }
  }

  if (topics.loan) {
    const cached = cache.get('loans_context');
    if (cached) {
      context.loans = cached;
    } else {
      const loans = await Loan.find().limit(5).select('name provider amount interest duration requirements').lean();
      cache.set('loans_context', loans);
      context.loans = loans;
    }
  }

  if (topics.group) {
    const cached = cache.get('groups_context');
    if (cached) {
      context.groups = cached;
    } else {
      const groups = await FarmerGroup.find().limit(5).select('name location cropType description members').lean();
      const data = groups.map(g => ({ name: g.name, location: g.location, cropType: g.cropType, members: g.members?.length || 0, description: g.description }));
      cache.set('groups_context', data);
      context.groups = data;
    }
  }

  if (topics.advice || topics.expert) {
    const cached = cache.get('advice_context');
    if (cached) {
      context.advice = cached;
    } else {
      const advice = await AdviceArticle.find().limit(5).select('title excerpt category content').lean();
      cache.set('advice_context', advice);
      context.advice = advice;
    }
  }

  if (topics.news) {
    const cached = cache.get('news_context');
    if (cached) {
      context.news = cached;
    } else {
      const news = await NewsArticle.find().limit(5).select('title excerpt category date').lean();
      cache.set('news_context', news);
      context.news = news;
    }
  }

  if (topics.weather) {
    const cached = cache.get('announcements_context');
    if (cached) {
      context.announcements = cached;
    } else {
      const announcements = await Announcement.find().limit(5).select('title type date location').lean();
      cache.set('announcements_context', announcements);
      context.announcements = announcements;
    }
  }

  return context;
}

function buildContextMessage(context) {
  if (!context || Object.keys(context).length === 0) return null;
  const parts = [];
  for (const [key, value] of Object.entries(context)) {
    parts.push(`LIVE DATA YA TOVUTI (${key.toUpperCase()}):\n${JSON.stringify(value, null, 2)}`);
  }
  return {
    role: 'system',
    content: `Hii ni data halisi kutoka kwenye tovuti ya Katavi E-Kilimo. Tumia data hii kujibu kwa usahihi. Ikiwa data haitoshi, sema hivyo na pendekeza hatua.\n\n${parts.join('\n\n')}`
  };
}

function buildErrorFallback(message) {
  return `Ninaomba radhi, kwa sasa siwezi kuendeshwa vizuri (seva ya AI haijawashwa). Hakikisha GROQ_API_KEY imewekwa kwenye .env ya server.\n\nKama unahitaji msaada wa haraka, wasiliana na timu yetu kupitia ukurasa wa "Contact" au ofisi ya kilimo ya eneo lako.`
}

router.post('/', async (req, res) => {
  try {
    const { message, history, language, location } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Tafadhali andika swali lako' });
    }

    if (!client) {
      return res.status(200).json({ reply: buildErrorFallback(message) });
    }

    const context = await gatherContext(message);
    const contextMsg = buildContextMessage(context);

    const now = new Date();
    const tanzaniaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' }));
    const currentDateTime = tanzaniaTime.toLocaleString('sw-TZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const season = getCurrentSeason(tanzaniaTime);

    const systemPrompt = buildSystemPrompt({ currentDateTime, location, season });

    const messages = [
      { ...systemPrompt },
      ...(contextMsg ? [contextMsg] : []),
      ...(Array.isArray(history) ? history.slice(-10) : []),
      { role: 'user', content: message },
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages,
      stream: true,
      max_tokens: 700,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Chatbot error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Hitilafu imetokea kwenye chatbot' });
    }
    res.end();
  }
});

module.exports = router;
