const Notification = require('../models/Notification');

const sendNotification = async (userId, { title, message, type = 'system', link = '', metadata = {} }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      link,
      metadata,
    });
    return notification;
  } catch (error) {
    console.error('Send notification error:', error);
    return null;
  }
};

const sendBulkNotifications = async (userIds, { title, message, type = 'system', link = '', metadata = {} }) => {
  try {
    const notifications = userIds.map(userId => ({
      user: userId,
      title,
      message,
      type,
      link,
      metadata,
    }));
    return await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Send bulk notifications error:', error);
    return [];
  }
};

const getUserNotifications = async (userId, { unreadOnly = false, limit = 20 } = {}) => {
  const query = { user: userId };
  if (unreadOnly) query.read = false;

  return Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

const markAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );
};

const markAllAsRead = async (userId) => {
  return Notification.updateMany(
    { user: userId, read: false },
    { read: true }
  );
};

module.exports = { sendNotification, sendBulkNotifications, getUserNotifications, markAsRead, markAllAsRead };
