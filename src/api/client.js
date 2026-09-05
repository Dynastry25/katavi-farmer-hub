import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kataviToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('kataviToken');
      localStorage.removeItem('kataviUser');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  verifyTwoFactor: (data) => api.post('/auth/2fa/verify', data),
  resendTwoFactor: (email) => api.post('/auth/2fa/resend', { email }),
  setupTwoFactor: (data) => api.post('/auth/2fa/setup', data),
};

// Crops API
export const cropsAPI = {
  getAll: (params) => api.get('/crops', { params }),
  getById: (id) => api.get(`/crops/${id}`),
  create: (data) => api.post('/crops', data),
  update: (id, data) => api.put(`/crops/${id}`, data),
  delete: (id) => api.delete(`/crops/${id}`),
  uploadImage: (id, formData) => api.post(`/crops/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Products API
export const productsAPI = {
  getAll: () => api.get('/products'),
  getMy: () => api.get('/products/my'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Orders API
export const ordersAPI = {
  getAll: () => api.get('/orders'),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
};

// News API
export const newsAPI = {
  getAll: (params) => api.get('/news', { params }),
  getById: (id) => api.get(`/news/${id}`),
  create: (data) => api.post('/news', data),
  update: (id, data) => api.put(`/news/${id}`, data),
  delete: (id) => api.delete(`/news/${id}`),
  trackView: (id) => api.put(`/news/${id}/view`),
};

// Suppliers API
export const suppliersAPI = {
  getAll: (params) => api.get('/suppliers', { params }),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

// Loans API
export const loansAPI = {
  getAll: () => api.get('/loans'),
  getMy: () => api.get('/loans/my'),
  apply: (data) => api.post('/loans/apply', data),
  updateApplication: (id, data) => api.put(`/loans/applications/${id}`, data),
};

// Farmer Groups API
export const farmerGroupsAPI = {
  getAll: () => api.get('/farmer-groups'),
  create: (data) => api.post('/farmer-groups', data),
  join: (id) => api.put(`/farmer-groups/${id}/join`),
  update: (id, data) => api.put(`/farmer-groups/${id}`, data),
  delete: (id) => api.delete(`/farmer-groups/${id}`),
};

// Chat API
export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  createConversation: (data) => api.post('/chat/conversations', data),
  getMessages: (conversationId) => api.get(`/chat/conversations/${conversationId}/messages`),
  sendMessage: (data) => api.post('/chat/messages', data),
  markAsRead: (conversationId) => api.put(`/chat/conversations/${conversationId}/read`),
};

// Contact API
export const contactAPI = {
  getAll: () => api.get('/contact'),
  send: (data) => api.post('/contact', data),
  markAsRead: (id) => api.put(`/contact/${id}/read`),
};

// Advice API
export const adviceAPI = {
  getArticles: () => api.get('/advice/articles'),
  getExperts: () => api.get('/advice/experts'),
  createArticle: (data) => api.post('/advice/articles', data),
  updateArticle: (id, data) => api.put(`/advice/articles/${id}`, data),
  deleteArticle: (id) => api.delete(`/advice/articles/${id}`),
};

// Videos API
export const videosAPI = {
  getAll: () => api.get('/videos'),
  create: (data) => api.post('/videos', data),
};

// Upload API
export const uploadAPI = {
  upload: (formData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadMultiple: (formData) => api.post('/upload/multiple', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Ratings API
export const ratingsAPI = {
  create: (data) => api.post('/ratings', data),
  getMy: () => api.get('/ratings/my'),
  getByUser: (id) => api.get(`/ratings/user/${id}`),
};

// Admin API (role management)
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  updateRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

// Chatbot API
export const chatbotAPI = {
  sendMessage: async ({ message, history, language, location, onDelta, signal }) => {
    const token = localStorage.getItem('kataviToken');
    const response = await fetch(`${API_BASE_URL}/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, history, language, location }),
      signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Hitilafu imetokea kwenye chatbot');
    }

    if (!response.body) {
      const data = await response.json();
      return data.reply;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.delta) {
            fullText += parsed.delta;
            if (onDelta) onDelta(fullText);
          }
        } catch (e) {
          // ignore parse errors for incomplete lines
        }
      }
    }

    return fullText;
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// Market Prices API
export const marketPricesAPI = {
  getAll: (params) => api.get('/market-prices', { params }),
  getAverage: (params) => api.get('/market-prices/average', { params }),
  getTrend: (params) => api.get('/market-prices/trend', { params }),
  getBaselines: (params) => api.get('/market-prices/baselines', { params }),
};

// Weather API
export const weatherAPI = {
  getForecast: (params) => api.get('/weather/forecast', { params }),
  getConfig: () => api.get('/weather/config'),
  getConfigAdmin: () => api.get('/weather/config/admin'),
  updateConfig: (data) => api.put('/weather/config', data),
  getZones: () => api.get('/weather/zones'),
  createZone: (data) => api.post('/weather/zones', data),
  updateZone: (id, data) => api.put(`/weather/zones/${id}`, data),
  deleteZone: (id) => api.delete(`/weather/zones/${id}`),
};

// Admin Extended API
export const adminExtendedAPI = {
  suspendUser: (id, suspend) => api.put(`/admin/users/${id}/suspend`, { suspend }),
  verifyUser: (id, verify) => api.put(`/admin/users/${id}/verify`, { verify }),
  getCrops: (params) => api.get('/admin/crops', { params }),
  moderateCrop: (id, status) => api.put(`/admin/crops/${id}/moderate`, { status }),
  getAdvisory: (params) => api.get('/admin/advice', { params }),
  moderateAdvisory: (id, status) => api.put(`/admin/advice/${id}/moderate`, { status }),
  getNewsAdmin: (params) => api.get('/admin/news', { params }),
  moderateNews: (id, status) => api.put(`/admin/news/${id}/moderate`, { status }),
  getMarketPrices: (params) => api.get('/admin/market-prices', { params }),
  createMarketPrice: (data) => api.post('/admin/market-prices', data),
  updateMarketPrice: (id, data) => api.put(`/admin/market-prices/${id}`, data),
  deleteMarketPrice: (id) => api.delete(`/admin/market-prices/${id}`),
  getLoanApplications: (params) => api.get('/admin/loans', { params }),
  moderateLoan: (id, status) => api.put(`/admin/loans/${id}/moderate`, { status }),
  updateLoanRepayment: (id, data) => api.put(`/admin/loans/${id}/repayment`, data),
  getGroups: (params) => api.get('/admin/groups', { params }),
  getRatings: (params) => api.get('/admin/ratings', { params }),
  getNotifications: (params) => api.get('/admin/notifications', { params }),
  broadcastNotification: (data) => api.post('/admin/notifications/broadcast', data),
  getDisputes: (params) => api.get('/admin/disputes', { params }),
  resolveDispute: (id, data) => api.put(`/admin/disputes/${id}/resolve`, data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
};

// Platform settings (public)
export const settingsAPI = {
  getPlatform: () => api.get('/settings/platform'),
};

// AI features
export const aiAPI = {
  detectCropDisease: (data) => api.post('/ai/crop-detect', data),
};

// Push notifications
export const pushAPI = {
  subscribe: (data) => api.post('/push/subscribe', data),
  unsubscribe: (data) => api.delete('/push/unsubscribe', { data }),
};

// Mobile money
export const paymentsAPI = {
  initiate: (data) => api.post('/payments/initiate', data),
  status: (transactionId) => api.get(`/payments/${transactionId}`),
};

// Price alerts
export const priceAlertsAPI = {
  getMy: () => api.get('/price-alerts/my'),
  create: (data) => api.post('/price-alerts', data),
  remove: (id) => api.delete(`/price-alerts/${id}`),
};

// Farmer finance (P&L)
export const farmerFinanceAPI = {
  summary: (months) => api.get(`/farmer-finance/summary?months=${months}`),
  getExpenses: () => api.get('/farmer-finance/expenses'),
  addExpense: (data) => api.post('/farmer-finance/expenses', data),
  removeExpense: (id) => api.delete(`/farmer-finance/expenses/${id}`),
};

// Shamba Assistant
export const shambaAPI = {
  getLandGuidance: (params) => api.get('/shamba/land', { params }),
  getPlanting: (params) => api.get('/shamba/planting', { params }),
  getCycleStage: (params) => api.get('/shamba/stage', { params }),
  getDiseases: (cropName) => api.get('/shamba/diseases', { params: { cropName } }),
};

// Admin analytics / forecasting
export const analyticsAPI = {
  getAdmin: () => api.get('/analytics/admin'),
};

export default api;
