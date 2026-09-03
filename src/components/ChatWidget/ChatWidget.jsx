import React, { useState, useEffect, useRef } from 'react';
import { chatbotAPI } from '../../api/client';
import './ChatWidget.css';

const SUGGESTED_QUESTIONS = [
  'Ninavyotumia tovuti hii?',
  'Bei ya mahindi sokoni ni ngapi?',
  'Ninawezaje kupata mikopo ya kilimo?',
  'Ninawezaje kujiunga na kikundi cha wakulima?',
  'Ninatakiwa kupanda mahindi wakati gani?',
  'Ninawezaje kuwasiliana na mtaalamu wa kilimo?',
];

const WELCOME_MESSAGE = {
  role: 'bot',
  text: 'Habari! Mimi ni Msaada 🌱, msaidizi wako wa kilimo kutoka Katavi E-Kilimo. Naweza kukusaidia na maswali kuhusu soko, mikopo, ushauri wa kilimo, na matumizi ya tovuti hii. Niulize swali lolote!',
};

function stripMarkdown(text) {
  return (text || '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^>\s*/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ''))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function detectLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=sw`,
            { headers: { 'User-Agent': 'KataviEkilimo/1.0' } }
          );
          const data = await resp.json();
          const addr = data.address || {};
          const parts = [addr.village, addr.town, addr.county, addr.state, addr.country].filter(Boolean);
          resolve(parts.join(', ') || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { timeout: 8000, maximumAge: 600000 }
    );
  });
}

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [language, setLanguage] = useState('sw');
  const [hasOpened, setHasOpened] = useState(false);
  const [location, setLocation] = useState(() => localStorage.getItem('kataviUserLocation') || '');
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('kataviChatHistory');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.length ? parsed : [WELCOME_MESSAGE]);
      } catch (e) {
        setMessages([WELCOME_MESSAGE]);
      }
    } else {
      setMessages([WELCOME_MESSAGE]);
    }
  }, []);

  useEffect(() => {
    if (!location) {
      detectLocation().then((loc) => {
        if (loc) {
          setLocation(loc);
          localStorage.setItem('kataviUserLocation', loc);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (messages.length) {
      localStorage.setItem('kataviChatHistory', JSON.stringify(messages.slice(-20)));
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setHasOpened(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  const sendMessage = async (text) => {
    const content = (text ?? input).trim();
    if (!content) return;

    const userMessage = { role: 'user', text: content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'bot')
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    const botMessage = { role: 'bot', text: '' };
    setMessages([...newMessages, botMessage]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await chatbotAPI.sendMessage({
        message: content,
        history,
        language,
        location: location || undefined,
        signal: controller.signal,
        onDelta: (fullText) => {
          updateBotMessage(stripMarkdown(fullText));
        },
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        updateBotMessage('Ninaomba radhi, kuna tatizo katika mawasiliano na seva. Tafadhali jaribu tena baadaye.');
      }
    } finally {
      setIsTyping(false);
      abortRef.current = null;
    }
  };

  const updateBotMessage = (text) => {
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = { role: 'bot', text };
      return next;
    });
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    localStorage.removeItem('kataviChatHistory');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectSuggested = (q) => {
    sendMessage(q);
  };

  const placeholder = language === 'sw'
    ? 'Andika swali lako...'
    : 'Type your question...';

  return (
    <>
      {isOpen && (
        <div className="chat-widget-window" role="dialog" aria-label="Chatbot">
          <div className="chat-widget-header">
            <div className="chat-widget-header-info">
              <div className="chat-widget-avatar"><i className="fas fa-seedling"></i></div>
              <div>
                <div className="chat-widget-title">Msaada wa Kilimo</div>
                <div className="chat-widget-status">✓ Mtandaoni</div>
              </div>
            </div>
            <div className="chat-widget-actions">
              <div className="language-toggle">
                <button
                  className={`lang-btn ${language === 'sw' ? 'active' : ''}`}
                  onClick={() => setLanguage('sw')}
                >
                  SW
                </button>
                <button
                  className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                  onClick={() => setLanguage('en')}
                >
                  EN
                </button>
              </div>
              <button className="chat-action-btn" onClick={clearChat} title="Anza upya">
                ↺
              </button>
              <button className="chat-action-btn" onClick={toggleChat} title="Funga">
                ✕
              </button>
            </div>
          </div>

          <div className="chat-widget-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-msg ${msg.role === 'user' ? 'user' : 'bot'}`}>
                {msg.role === 'bot' && <div className="chat-msg-avatar"><i className="fas fa-seedling"></i></div>}
                <div className="chat-bubble">
                  {msg.text ? (
                    <span className="chat-text">{msg.text}</span>
                  ) : (
                    <>
                      <span className="typing-dot">.</span>
                      <span className="typing-dot">.</span>
                      <span className="typing-dot">.</span>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && !hasOpened && (
            <div className="chat-suggestions">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  className="suggestion-btn"
                  onClick={() => selectSuggested(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="chat-widget-footer">
            <input
              ref={inputRef}
              className="chat-widget-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
            />
            <button
              className="chat-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim()}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <button
        className={`chat-widget-toggle ${isOpen ? 'open' : ''}`}
        onClick={toggleChat}
        aria-label={isOpen ? 'Funga chatbot' : 'Fungua chatbot'}
      >
        {isOpen ? <i className="fas fa-times"></i> : <i className="fas fa-comment-dots"></i>}
      </button>
    </>
  );
};

export default ChatWidget;
