const mongoose = require('mongoose');

const adviceArticleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  excerpt: { type: String, required: true },
  content: { type: String, default: '' },
  category: { type: String, required: true },
  readTime: { type: String, default: '5 min' },
  date: { type: String, default: () => new Date().toLocaleDateString('sw-TZ') },
  image: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('AdviceArticle', adviceArticleSchema);
