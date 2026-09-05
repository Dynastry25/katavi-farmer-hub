const User = require('../models/User');
const Crop = require('../models/Crop');
const Order = require('../models/Order');
const Product = require('../models/Product');
const LoanApplication = require('../models/LoanApplication');
const FarmerGroup = require('../models/FarmerGroup');
const NewsArticle = require('../models/NewsArticle');
const AdviceArticle = require('../models/AdviceArticle');
const Supplier = require('../models/Supplier');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const MarketPrice = require('../models/MarketPrice');
const Rating = require('../models/Rating');
const PlatformSetting = require('../models/PlatformSetting');

exports.getStats = async (req, res) => {
  try {
    const [farmers, buyers, experts, admins, totalUsers, totalCrops, totalOrders, totalProducts, totalLoans, totalGroups, totalNotifications, totalRatings] =
      await Promise.all([
        User.countDocuments({ role: 'farmer' }),
        User.countDocuments({ role: 'buyer' }),
        User.countDocuments({ role: 'expert' }),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({}),
        Crop.countDocuments({}),
        Order.countDocuments({}),
        Product.countDocuments({}),
        LoanApplication.countDocuments({}),
        FarmerGroup.countDocuments({}),
        Notification.countDocuments({}),
        Rating.countDocuments({}),
      ]);

    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleString('en', { month: 'short' }), start: d });
    }
    const monthlyUsers = [];
    for (let i = 0; i < months.length; i++) {
      const start = months[i].start;
      const end = i + 1 < months.length ? months[i + 1].start : new Date();
      const count = await User.countDocuments({ createdAt: { $gte: start, $lt: end } });
      monthlyUsers.push({ month: months[i].label, users: count });
    }

    const recentUsers = await User.find().select('-password').sort({ createdAt: -1 }).limit(6);

    res.json({
      farmers, buyers, experts, admins, totalUsers,
      totalCrops, totalOrders, totalProducts, totalLoans, totalGroups,
      totalNotifications, totalRatings,
      monthlyUsers, recentUsers,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role && role !== 'all') filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Mtumiaji haupatikani' });
    res.json(user);
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['farmer', 'buyer', 'expert', 'admin', 'support', 'content_moderator', 'finance_officer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Jukumu siyo sahihi' });
    }

    const staffRoles = ['admin', 'support', 'content_moderator', 'finance_officer'];
    if (req.user.role !== 'admin' && staffRoles.includes(role)) {
      return res.status(403).json({ message: 'Wewe pekee unaweza kubadilisha majukumu ya wafanyakazi' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Mtumiaji haupatikani' });

    if (user._id.toString() === req.user._id.toString() && role !== 'admin') {
      return res.status(400).json({ message: 'Huwezi kubadilisha jukumu lako mwenyewe' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await AuditLog.create({
      user: req.user._id, userName: req.user.name, userRole: req.user.role,
      action: 'change_user_role', category: 'user',
      targetType: 'User', targetId: user._id,
      details: { oldRole, newRole: role, targetUser: user.name },
      ipAddress: req.ip,
    });

    res.json({ message: 'Jukumu limebadilishwa kikamilifu', user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Admin change role error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, phone, location, district, ward, village, businessType, expertise } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Mtumiaji haupatikani' });

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (district !== undefined) user.district = district;
    if (ward !== undefined) user.ward = ward;
    if (village !== undefined) user.village = village;
    if (businessType !== undefined) user.businessType = businessType;
    if (expertise !== undefined) user.expertise = expertise;

    await user.save();
    res.json({ message: 'Mtumiaji amesasishwa kikamilifu' });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Huwezi kujifuta mwenyewe' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'Mtumiaji haupatikani' });

    await AuditLog.create({
      user: req.user._id, userName: req.user.name, userRole: req.user.role,
      action: 'delete_user', category: 'user',
      targetType: 'User', targetId: req.params.id,
      details: { deletedUser: user.name, deletedRole: user.role },
      ipAddress: req.ip,
    });

    res.json({ message: 'Mtumiaji amefutwa kikamilifu' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role, location, district, ward, village, businessType, expertise } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Taarifa zote muhimu zinahitajika' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Barua pepe hii tayari imesajiliwa' });
    }

    const validRoles = ['farmer', 'buyer', 'expert', 'admin', 'support', 'content_moderator', 'finance_officer'];
    const userRole = validRoles.includes(role) ? role : 'farmer';

    const user = await User.create({
      name, email, phone, password, role: userRole,
      location: location || district || '',
      district, ward, village, businessType, expertise,
    });

    await AuditLog.create({
      user: req.user._id, userName: req.user.name, userRole: req.user.role,
      action: 'create_user', category: 'user',
      targetType: 'User', targetId: user._id,
      details: { newUser: user.name, role: user.role },
      ipAddress: req.ip,
    });

    res.status(201).json({
      _id: user._id, name: user.name, email: user.email,
      phone: user.phone, role: user.role, location: user.location,
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Mtumiaji haupatikani' });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Huwezi kusimamisha mwenyewe' });
    }

    user.isActive = req.body.suspend !== false ? false : true;
    await user.save();

    await AuditLog.create({
      user: req.user._id, userName: req.user.name, userRole: req.user.role,
      action: user.isActive ? 'activate_user' : 'suspend_user', category: 'user',
      targetType: 'User', targetId: user._id,
      details: { targetUser: user.name, isActive: user.isActive },
      ipAddress: req.ip,
    });

    res.json({ message: user.isActive ? 'Mtumiaji amewashwa' : 'Mtumiaji amesimamishwa', user });
  } catch (error) {
    console.error('Admin suspend user error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getCrops = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;

    const total = await Crop.countDocuments(filter);
    const crops = await Crop.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ crops, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin list crops error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.moderateCrop = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['available', 'sold', 'reserved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Hali siyo sahihi' });
    }

    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ message: 'Zao hili halipatikani' });

    crop.status = status;
    await crop.save();

    await AuditLog.create({
      user: req.user._id, userName: req.user.name, userRole: req.user.role,
      action: 'moderate_crop', category: 'product',
      targetType: 'Crop', targetId: crop._id,
      details: { cropName: crop.name, newStatus: status },
      ipAddress: req.ip,
    });

    res.json({ message: 'Zao limerekebishwa', crop });
  } catch (error) {
    console.error('Admin moderate crop error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getMarketPrices = async (req, res) => {
  try {
    const { cropName, region, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (cropName) filter.cropName = new RegExp(cropName, 'i');
    if (region) filter.region = region;

    const total = await MarketPrice.countDocuments(filter);
    const prices = await MarketPrice.find(filter)
      .sort({ dateRecorded: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ prices, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin list market prices error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.createMarketPrice = async (req, res) => {
  try {
    const { cropName, category, region, district, pricePerUnit, unit, season, isBaseline, notes } = req.body;

    if (!cropName || !category || !region || pricePerUnit === undefined) {
      return res.status(400).json({ message: 'Taarifa zote muhimu zinahitajika' });
    }

    const price = await MarketPrice.create({
      cropName, category, region, district,
      pricePerUnit, unit, season, isBaseline, notes,
      recordedBy: req.user._id,
    });

    await AuditLog.create({
      user: req.user._id, userName: req.user.name, userRole: req.user.role,
      action: 'create_market_price', category: 'content',
      targetType: 'MarketPrice', targetId: price._id,
      details: { cropName, region, pricePerUnit },
      ipAddress: req.ip,
    });

    res.status(201).json(price);
  } catch (error) {
    console.error('Admin create market price error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.updateMarketPrice = async (req, res) => {
  try {
    const price = await MarketPrice.findById(req.params.id);
    if (!price) return res.status(404).json({ message: 'Bei hii haipatikani' });

    Object.assign(price, req.body);
    await price.save();
    res.json(price);
  } catch (error) {
    console.error('Admin update market price error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.deleteMarketPrice = async (req, res) => {
  try {
    const price = await MarketPrice.findByIdAndDelete(req.params.id);
    if (!price) return res.status(404).json({ message: 'Bei hii haipatikani' });
    res.json({ message: 'Bei imefutwa' });
  } catch (error) {
    console.error('Admin delete market price error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getLoanApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const total = await LoanApplication.countDocuments(filter);
    const applications = await LoanApplication.find(filter)
      .populate('user', 'name email phone creditScore trustScore isVerified')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ applications, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin list loan applications error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.moderateLoan = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Hali siyo sahihi' });
    }

    const application = await LoanApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Maombi haya hayapatikani' });

    application.status = status;
    await application.save();

    if (application.user) {
      const { sendNotification } = require('../services/notification.service');
      await sendNotification(application.user, {
        title: status === 'approved' ? 'Maombi yako yamekubaliwa' : 'Maombi yako yamekataliwa',
        message: `Maombi ya mkopo "${application.loanName}" yame${status === 'approved' ? 'kubaliwa' : 'kataliwa'}.`,
        type: 'loan',
      });
    }

    await AuditLog.create({
      user: req.user._id, userName: req.user.name, userRole: req.user.role,
      action: 'moderate_loan', category: 'loan',
      targetType: 'LoanApplication', targetId: application._id,
      details: { loanName: application.loanName, newStatus: status },
      ipAddress: req.ip,
    });

    res.json({ message: `Maombi yame${status === 'approved' ? 'kubaliwa' : 'kukataliwa'}`, application });
  } catch (error) {
    console.error('Admin moderate loan error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { category, user, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (user) filter.user = user;

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin audit logs error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await Notification.countDocuments();
    const notifications = await Notification.find()
      .populate('user', 'name role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ notifications, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin list notifications error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.broadcastNotification = async (req, res) => {
  try {
    const { title, message, type, targetRole, targetDistrict, sendVia } = req.body;
    const channels = Array.isArray(sendVia) && sendVia.length ? sendVia : ['in_app', 'sms'];

    if (!title || !message) {
      return res.status(400).json({ message: 'Kichwa na ujumbe vinahitajika' });
    }

    const filter = {};
    if (targetRole) filter.role = targetRole;
    if (targetDistrict) filter.district = targetDistrict;

    const users = await User.find(filter).select('_id phone');
    const userIds = users.map(u => u._id);

    if (userIds.length === 0) {
      return res.status(400).json({ message: 'Hakuna walengwa waliofaulisha vigezo' });
    }

    const { sendBulkNotifications } = require('../services/notification.service');
    const notifications = await sendBulkNotifications(userIds, {
      title, message, type: type || 'system',
      sentVia: channels.filter(c => c !== 'sms'),
    });

    let smsResult = null;
    if (channels.includes('sms')) {
      const { sendBulkSms } = require('../services/sms.service');
      smsResult = await sendBulkSms(
        users.map(u => u.phone),
        `${title}\n${message}`
      );
    }

    let pushResult = null;
    if (channels.includes('push')) {
      const { sendPushToUsers } = require('../services/push.service');
      pushResult = await sendPushToUsers(userIds, { title, message, type: type || 'system' });
    }

    await AuditLog.create({
      user: req.user._id, userName: req.user.name, userRole: req.user.role,
      action: 'broadcast_notification', category: 'system',
      details: { title, recipientCount: userIds.length, targetRole, targetDistrict, channels, sms: smsResult, push: pushResult },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: `Ujumbe umetumwa kwa watumiaji ${userIds.length}`,
      count: notifications.length,
      sms: smsResult ? { attempted: smsResult.attempted, successCount: smsResult.successCount, mock: true } : null,
      push: pushResult ? { attempted: pushResult.attempted, successCount: pushResult.successCount, mock: pushResult.successCount === 0 } : null,
    });
  } catch (error) {
    console.error('Admin broadcast error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getDisputes = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const total = await Order.countDocuments({ ...filter, status: { $in: ['disputed', 'cancelled'] } });
    const disputes = await Order.find({ ...filter, status: { $in: ['disputed', 'cancelled'] } })
      .populate('buyer', 'name email phone')
      .populate('farmer', 'name email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ disputes, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin disputes error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getGroups = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await FarmerGroup.countDocuments();
    const groups = await FarmerGroup.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ groups, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin groups error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getRatings = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await Rating.countDocuments();
    const ratings = await Rating.find()
      .populate('rater', 'name role')
      .populate('ratedUser', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ ratings, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin ratings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.verifyUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Mtumiaji haupatikani' });

    user.isVerified = req.body.verify !== false ? true : false;
    await user.save();

    await AuditLog.create({
      user: req.user._id, userName: req.user.name, userRole: req.user.role,
      action: user.isVerified ? 'verify_user' : 'unverify_user', category: 'user',
      targetType: 'User', targetId: user._id,
      details: { targetUser: user.name, isVerified: user.isVerified },
      ipAddress: req.ip,
    });

    res.json({ message: user.isVerified ? 'Mtumiaji amethibitishwa (verified)' : 'Uthibitisho umeondolewa', user });
  } catch (error) {
    console.error('Admin verify user error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getAdvice = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const total = await AdviceArticle.countDocuments(filter);
    const articles = await AdviceArticle.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));

    res.json({ articles, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin list advice error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.moderateAdvice = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Hali siyo sahihi' });
    }

    const article = await AdviceArticle.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Makala haipatikani' });

    article.status = status;
    await article.save();

    await AuditLog.create({
      user: req.user._id, userName: req.user.name, userRole: req.user.role,
      action: 'moderate_advice', category: 'content',
      targetType: 'AdviceArticle', targetId: article._id,
      details: { title: article.title, newStatus: status },
      ipAddress: req.ip,
    });

    res.json({ message: 'Makala imerekebishwa', article });
  } catch (error) {
    console.error('Admin moderate advice error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getNewsAdmin = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const total = await NewsArticle.countDocuments(filter);
    const articles = await NewsArticle.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));

    res.json({ news: articles, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin list news error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.moderateNews = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Hali siyo sahihi' });
    }

    const article = await NewsArticle.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Makala haipatikani' });

    article.status = status;
    await article.save();

    await AuditLog.create({
      user: req.user._id, userName: req.user.name, userRole: req.user.role,
      action: 'moderate_news', category: 'content',
      targetType: 'NewsArticle', targetId: article._id,
      details: { title: article.title, newStatus: status },
      ipAddress: req.ip,
    });

    res.json({ message: 'Makala imerekebishwa', article });
  } catch (error) {
    console.error('Admin moderate news error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.updateLoanRepayment = async (req, res) => {
  try {
    const { repaymentStatus, remaining, nextPayment, repayments } = req.body;
    const application = await LoanApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Maombi ya mkopo hayapatikani' });

    if (repaymentStatus) application.repaymentStatus = repaymentStatus;
    if (remaining !== undefined) application.remaining = remaining;
    if (nextPayment !== undefined) application.nextPayment = nextPayment;
    if (Array.isArray(repayments)) application.repayments = repayments;
    await application.save();

    if (application.user) {
      try {
        const { refreshCreditData } = require('../services/creditScore.service');
        await refreshCreditData(application.user);
      } catch (e) {
        console.error('Credit refresh error:', e.message);
      }
    }

    await AuditLog.create({
      user: req.user._id, userName: req.user.name, userRole: req.user.role,
      action: 'update_loan_repayment', category: 'loan',
      targetType: 'LoanApplication', targetId: application._id,
      details: { loanName: application.loanName, repaymentStatus: application.repaymentStatus },
      ipAddress: req.ip,
    });

    res.json({ message: 'Malipo ya mkopo yamerekebishwa', application });
  } catch (error) {
    console.error('Admin update loan repayment error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.resolveDispute = async (req, res) => {
  try {
    const { status, resolution } = req.body;
    if (!['completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Hali siyo sahihi' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });

    order.status = status;
    order.resolution = resolution || '';
    await order.save();

    await AuditLog.create({
      user: req.user._id, userName: req.user.name, userRole: req.user.role,
      action: 'resolve_dispute', category: 'order',
      targetType: 'Order', targetId: order._id,
      details: { cropName: order.cropName, newStatus: status, resolution: order.resolution },
      ipAddress: req.ip,
    });

    res.json({ message: 'Mgogoro umetatuliwa', order });
  } catch (error) {
    console.error('Admin resolve dispute error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getSettings = async (req, res) => {
  try {
    let setting = await PlatformSetting.findOne({ key: 'platform' });
    if (!setting) {
      setting = await PlatformSetting.create({ key: 'platform' });
    }
    res.json({
      commissionRate: setting.commissionRate,
      featuredListingsEnabled: setting.featuredListingsEnabled,
      bannerMessage: setting.bannerMessage,
      bannerActive: setting.bannerActive,
    });
  } catch (error) {
    console.error('Admin get settings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { commissionRate, featuredListingsEnabled, bannerMessage, bannerActive } = req.body;

    let setting = await PlatformSetting.findOne({ key: 'platform' });
    if (!setting) {
      setting = await PlatformSetting.create({ key: 'platform' });
    }

    if (commissionRate !== undefined) {
      const rate = Number(commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return res.status(400).json({ message: 'Asilimia ya tume iwe kati ya 0 na 100' });
      }
      setting.commissionRate = rate;
    }
    if (featuredListingsEnabled !== undefined) setting.featuredListingsEnabled = Boolean(featuredListingsEnabled);
    if (bannerMessage !== undefined) setting.bannerMessage = String(bannerMessage).slice(0, 500);
    if (bannerActive !== undefined) setting.bannerActive = Boolean(bannerActive);

    setting.updatedBy = req.user._id;
    await setting.save();

    await AuditLog.create({
      user: req.user._id, userName: req.user.name, userRole: req.user.role,
      action: 'update_settings', category: 'settings',
      targetType: 'PlatformSetting', targetId: setting._id,
      details: {
        commissionRate: setting.commissionRate,
        featuredListingsEnabled: setting.featuredListingsEnabled,
        bannerActive: setting.bannerActive,
      },
      ipAddress: req.ip,
    });

    res.json({
      message: 'Mipangilio imehifadhiwa',
      settings: {
        commissionRate: setting.commissionRate,
        featuredListingsEnabled: setting.featuredListingsEnabled,
        bannerMessage: setting.bannerMessage,
        bannerActive: setting.bannerActive,
      },
    });
  } catch (error) {
    console.error('Admin update settings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};
