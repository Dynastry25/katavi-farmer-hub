const { Groq } = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = require('../config/chatbotSystemPrompt');

const chatCompletion = async (messages, options = {}) => {
  try {
    const response = await groq.chat.completions.create({
      model: options.model || 'qwen/qwen3.8-27b',
      messages: [
        SYSTEM_PROMPT({ currentDateTime: new Date().toLocaleString('sw-TZ') }),
        ...messages,
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1024,
      stream: false,
    });

    return response.choices[0]?.message?.content || 'Samahani, sijaelewa. Tafadhali jaribu tena.';
  } catch (error) {
    console.error('AI Service Error:', error.message);
    throw new Error('Hitilafu imetokea kwenye huduma ya AI');
  }
};

const chatCompletionStream = async (messages, options = {}) => {
  try {
    const stream = await groq.chat.completions.create({
      model: options.model || 'qwen/qwen3.8-27b',
      messages: [
        SYSTEM_PROMPT({ currentDateTime: new Date().toLocaleString('sw-TZ') }),
        ...messages,
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1024,
      stream: true,
    });

    return stream;
  } catch (error) {
    console.error('AI Service Stream Error:', error.message);
    throw new Error('Hitilafu imetokea kwenye huduma ya AI');
  }
};

module.exports = { chatCompletion, chatCompletionStream };
