import React, { useState, useEffect, useRef } from 'react';
import './ChatSystem.css';

const ChatSystem = ({ user, onClose, onPageChange }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sample chat data
  const chats = [
    {
      id: 1,
      name: 'Juma Mwinyi',
      type: 'farmer',
      unread: 2,
      lastMessage: 'Nina mahindi ya bei nafuu',
      lastTime: '10:30 AM',
      online: true,
      avatar: '👨‍🌾',
      rating: 4.8
    },
    {
      id: 2,
      name: 'Agro Supplies Ltd',
      type: 'supplier',
      unread: 0,
      lastMessage: 'Tuna mbolea mpya ya CAN',
      lastTime: 'Yesterday',
      online: false,
      avatar: '🏢',
      rating: 4.9
    },
    {
      id: 3,
      name: 'NMB Mikopo',
      type: 'loan',
      unread: 1,
      lastMessage: 'Mkopo wako umeidhinishwa',
      lastTime: '2 days ago',
      online: true,
      avatar: '💰',
      rating: 4.7
    },
    {
      id: 4,
      name: 'Kikundi cha Wakulima Mpanda',
      type: 'group',
      unread: 5,
      lastMessage: 'Mkutano wa wiki ijayo',
      lastTime: '1 hour ago',
      online: true,
      avatar: '👥',
      members: 25
    },
    {
      id: 5,
      name: 'Daktari Mimea',
      type: 'expert',
      unread: 0,
      lastMessage: 'Njia za kudhibiti wadudu',
      lastTime: '1 week ago',
      online: false,
      avatar: '🔬',
      rating: 4.9
    }
  ];

  // Sample messages
  const sampleMessages = {
    1: [
      { id: 1, text: 'Habari, nina nia ya kununua mahindi yako', sender: 'me', time: '10:25 AM', read: true },
      { id: 2, text: 'Habari! Nina mahindi mazuri ya kilo 500', sender: 'other', time: '10:26 AM', read: true },
      { id: 3, text: 'Bei yake ni ngapi kwa kilo?', sender: 'me', time: '10:27 AM', read: true },
      { id: 4, text: 'TZS 1,500 kwa kilo. Nipo Mpanda', sender: 'other', time: '10:28 AM', read: true },
      { id: 5, text: 'Naweza kupata picha ya mahindi?', sender: 'me', time: '10:30 AM', read: false }
    ],
    2: [
      { id: 1, text: 'Habari, nina hitaji la mbolea ya CAN', sender: 'me', time: '09:15 AM', read: true },
      { id: 2, text: 'Karibu! Tuna mbolea bora ya CAN', sender: 'other', time: '09:16 AM', read: true },
      { id: 3, text: 'Bei ya mfuko wa kilo 50?', sender: 'me', time: '09:17 AM', read: true },
      { id: 4, text: 'TZS 45,000 kwa mfuko. Tuna uwasilishaji', sender: 'other', time: '09:18 AM', read: true }
    ],
    3: [
      { id: 1, text: 'Naomba kufahamu kuhusu mkopo wa kilimo', sender: 'me', time: 'Yesterday', read: true },
      { id: 2, text: 'Habari! Mkopo wetu una riba 12% kwa mwaka', sender: 'other', time: 'Yesterday', read: true },
      { id: 3, text: 'Mkopo wako umeidhinishwa! Tutaungana nawe', sender: 'other', time: '10:00 AM', read: false }
    ],
    4: [
      { id: 1, text: 'Mkutano wetu uko tarehe 15', sender: 'system', time: '1 hour ago', read: true },
      { id: 2, text: 'Nina shida ya wadudu kwenye mahindi', sender: 'other', time: '45 mins ago', read: true },
      { id: 3, text: 'Nitumie picha tutakusaidia', sender: 'expert', time: '30 mins ago', read: true },
      { id: 4, text: 'Nina picha nitumie kwa group?', sender: 'me', time: '15 mins ago', read: false }
    ],
    5: [
      { id: 1, text: 'Habari Daktari, mimea yana majani manjano', sender: 'me', time: '1 week ago', read: true },
      { id: 2, text: 'Hiyo ni dalili ya upungufu wa nitrojeni', sender: 'other', time: '1 week ago', read: true },
      { id: 3, text: 'Tumia mbolea ya CAN au urea', sender: 'other', time: '1 week ago', read: true }
    ]
  };

  // Emojis for quick selection
  const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥'];

  useEffect(() => {
    if (activeChat) {
      setMessages(sampleMessages[activeChat.id] || []);
      // Mark messages as read when chat is opened
      const updatedChats = chats.map(chat => 
        chat.id === activeChat.id ? { ...chat, unread: 0 } : chat
      );
    }
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        text: newMessage,
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };
      setMessages([...messages, message]);
      setNewMessage('');
      setShowEmojiPicker(false);
      
      // Simulate typing and response
      if (activeChat && activeChat.type !== 'group') {
        setIsTyping(true);
        setTimeout(() => {
          const response = {
            id: messages.length + 2,
            text: getAutoResponse(newMessage),
            sender: 'other',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: true
          };
          setMessages(prev => [...prev, response]);
          setIsTyping(false);
        }, 2000);
      }
    }
  };

  const getAutoResponse = (message) => {
    const responses = {
      'mahindi': 'Nina mahindi mazuri ya kilo 500 kwa TZS 1,500/kg',
      'mbolea': 'Tuna mbolea ya CAN kwa TZS 45,000 kwa mfuko',
      'mkopo': 'Mkopo wetu una riba 12% kwa mwaka, hadi TZS 50M',
      'picha': 'Naweza kutuma picha kwa ujumbe unaofuata',
      'bei': 'Bei yetu ni nafuu na inajumuisha uwasilishaji',
      'habari': 'Habari! Ninafurahi kuwasiliana nawe'
    };

    const lowerMessage = message.toLowerCase();
    for (const [key, response] of Object.entries(responses)) {
      if (lowerMessage.includes(key)) {
        return response;
      }
    }
    
    return 'Asante kwa ujumbe wako. Nitarespond kwa haraka!';
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const message = {
        id: messages.length + 1,
        type: 'file',
        fileName: file.name,
        fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };
      setMessages([...messages, message]);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleMessageAction = (messageId, action) => {
    if (action === 'reply') {
      const message = messages.find(m => m.id === messageId);
      setNewMessage(`Replying to: ${message.text} `);
    } else if (action === 'copy') {
      const message = messages.find(m => m.id === messageId);
      navigator.clipboard.writeText(message.text);
    }
    setShowMessageMenu(false);
    setSelectedMessage(null);
  };

  const handleReactToMessage = (messageId, emoji) => {
    setMessages(messages.map(msg => 
      msg.id === messageId 
        ? { ...msg, reaction: emoji }
        : msg
    ));
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getChatSubtitle = (chat) => {
    switch (chat.type) {
      case 'farmer':
        return `Mkulima • ⭐ ${chat.rating}`;
      case 'supplier':
        return `Msambazaji • ⭐ ${chat.rating}`;
      case 'loan':
        return `Mikopo • ⭐ ${chat.rating}`;
      case 'group':
        return `Kikundi • ${chat.members} wanachama`;
      case 'expert':
        return `Mtaalamu • ⭐ ${chat.rating}`;
      default:
        return 'Mtu binafsi';
    }
  };

  return (
    <div className="chat-system">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="header-content">
          <h3>💬 Mazungumzo</h3>
          <p>Wasiliana na wakulima na wadau</p>
        </div>
        <div className="header-actions">
          <button className="header-btn" title="Mipangilio">
            <i className="fas fa-cog"></i>
          </button>
          <button className="close-btn" onClick={onClose} title="Funga">
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div className="chat-container">
        {/* Chat Sidebar */}
        <div className="chat-sidebar">
          <div className="sidebar-header">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Tafuta mazungumzo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="chat-list">
            {filteredChats.map(chat => (
              <div
                key={chat.id}
                className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
                onClick={() => setActiveChat(chat)}
              >
                <div className="chat-avatar">
                  {chat.avatar}
                  {chat.online && <div className="online-indicator"></div>}
                </div>
                
                <div className="chat-info">
                  <div className="chat-main-info">
                    <div className="chat-name">{chat.name}</div>
                    {chat.unread > 0 && (
                      <div className="unread-badge">{chat.unread}</div>
                    )}
                  </div>
                  <div className="chat-subtitle">{getChatSubtitle(chat)}</div>
                  <div className="chat-preview">{chat.lastMessage}</div>
                </div>

                <div className="chat-meta">
                  <div className="chat-time">{chat.lastTime}</div>
                  {chat.unread > 0 && <div className="unread-dot"></div>}
                </div>
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <button 
              className="new-chat-btn"
              onClick={() => onPageChange('farmer-groups')}
            >
              <i className="fas fa-plus"></i>
              Anza Mazungumzo Mpya
            </button>
          </div>
        </div>

        {/* Chat Main Area */}
        <div className="chat-main">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="chat-header-info">
                <div className="chat-user-info">
                  <div className="user-avatar">
                    {activeChat.avatar}
                    {activeChat.online && <div className="online-indicator"></div>}
                  </div>
                  <div className="user-details">
                    <div className="user-name">{activeChat.name}</div>
                    <div className="user-status">
                      {activeChat.online ? 'Online' : 'Offline'} • {getChatSubtitle(activeChat)}
                    </div>
                  </div>
                </div>
                
                <div className="chat-actions">
                  <button className="action-btn" title="Piga Simu">
                    <i className="fas fa-phone"></i>
                  </button>
                  <button className="action-btn" title="Video Call">
                    <i className="fas fa-video"></i>
                  </button>
                  <button className="action-btn" title="Maelezo">
                    <i className="fas fa-info-circle"></i>
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="empty-chat">
                    <div className="empty-icon">💬</div>
                    <h4>Hakuna ujumbe bado</h4>
                    <p>Anza mazungumzo kwa kutuma ujumbe wa kwanza</p>
                  </div>
                ) : (
                  <>
                    {messages.map(message => (
                      <div
                        key={message.id}
                        className={`message ${message.sender} ${message.type || 'text'}`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedMessage(message.id);
                          setShowMessageMenu(true);
                        }}
                      >
                        {message.type === 'file' ? (
                          <div className="message-file">
                            <div className="file-icon">
                              <i className="fas fa-file"></i>
                            </div>
                            <div className="file-info">
                              <div className="file-name">{message.fileName}</div>
                              <div className="file-size">{message.fileSize}</div>
                            </div>
                            <button className="download-btn">
                              <i className="fas fa-download"></i>
                            </button>
                          </div>
                        ) : message.sender === 'system' ? (
                          <div className="system-message">
                            {message.text}
                          </div>
                        ) : (
                          <>
                            <div className="message-bubble">
                              <div className="message-text">{message.text}</div>
                              <div className="message-footer">
                                <span className="message-time">{message.time}</span>
                                {message.sender === 'me' && (
                                  <span className={`message-status ${message.read ? 'read' : 'sent'}`}>
                                    {message.read ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {message.reaction && (
                              <div className="message-reaction">
                                {message.reaction}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="typing-indicator">
                        <div className="typing-avatar">{activeChat.avatar}</div>
                        <div className="typing-content">
                          <div className="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                          <div className="typing-text">Inaandika...</div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <div className="chat-input-area">
                <div className="input-actions">
                  <button 
                    className="action-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Pakia Faili"
                  >
                    <i className="fas fa-paperclip"></i>
                  </button>
                  <button 
                    className="action-btn"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Emoji"
                  >
                    <i className="fas fa-smile"></i>
                  </button>
                  <button className="action-btn" title="Rekodi Sauti">
                    <i className="fas fa-microphone"></i>
                  </button>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                </div>

                <div className="message-input-container">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Andika ujumbe hapa..."
                    rows="1"
                    className="message-input"
                  />
                  
                  {showEmojiPicker && (
                    <div className="emoji-picker">
                      <div className="emoji-header">
                        <span>Emoji</span>
                        <button 
                          className="close-emoji"
                          onClick={() => setShowEmojiPicker(false)}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <div className="quick-emojis">
                        {quickEmojis.map(emoji => (
                          <button
                            key={emoji}
                            className="emoji-btn"
                            onClick={() => handleEmojiSelect(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="send-btn"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  title="Tuma Ujumbe"
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <div className="welcome-illustration">
                <div className="illustration">💬</div>
                <h3>Chagua Mazungumzo</h3>
                <p>Chagua mazungumzo kutoka kwenye orodha ya kulia kuanza kuwasiliana</p>
                <div className="welcome-features">
                  <div className="feature">
                    <i className="fas fa-users"></i>
                    <span>Wasiliana na Wakulima</span>
                  </div>
                  <div className="feature">
                    <i className="fas fa-truck"></i>
                    <span>Pata Wauzaji</span>
                  </div>
                  <div className="feature">
                    <i className="fas fa-hand-holding-usd"></i>
                    <span>Omba Mikopo</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Context Menu */}
      {showMessageMenu && (
        <div 
          className="context-menu"
          onClick={() => setShowMessageMenu(false)}
        >
          <div className="menu-content">
            <button 
              className="menu-item"
              onClick={() => handleMessageAction(selectedMessage, 'reply')}
            >
              <i className="fas fa-reply"></i>
              Jibu
            </button>
            <button 
              className="menu-item"
              onClick={() => handleMessageAction(selectedMessage, 'copy')}
            >
              <i className="fas fa-copy"></i>
              Nakili
            </button>
            <button className="menu-item">
              <i className="fas fa-share"></i>
              Sambaza
            </button>
            <div className="menu-divider"></div>
            <button className="menu-item delete">
              <i className="fas fa-trash"></i>
              Futa
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSystem;