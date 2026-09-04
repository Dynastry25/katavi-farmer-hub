const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Usajili unahitajika' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Mtumiaji huyu haupatikani' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Akaunti yako imesimamishwa. Wasiliana na msimamizi.' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Tokeni siyo sahihi' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      req.user = user;
      req.token = token;
    }
    next();
  } catch (error) {
    next();
  }
};

// Require an authenticated user with admin role
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Usajili unahitajika' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Mtumiaji huyu haupatikani' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Akaunti yako imesimamishwa. Wasiliana na msimamizi.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Huna ruhusa ya kufanya kitendo hiki' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Tokeni siyo sahihi' });
  }
};

module.exports = { auth, optionalAuth, requireAdmin };
