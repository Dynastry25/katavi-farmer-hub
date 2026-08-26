const mongoose = require('mongoose');

const newsArticleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  excerpt: { type: String, required: true },
  content: { type: String, default: '' },
  category: { type: String, required: true },
  author: { type: String, required: true },
  date: { type: String, default: () => new Date().toLocaleDateString('sw-TZ', { year: 'numeric', month: 'long', day: 'numeric' }) },
  readTime: { type: String, default: '5 min' },
  image: { type: String, default: '' },
  featured: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('NewsArticle', newsArticleSchema);
