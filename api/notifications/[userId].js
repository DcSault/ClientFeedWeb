const { readJSON, NOTIFICATIONS_FILE, setCorsHeaders } = require('../utils/helpers');

module.exports = (req, res) => {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    const { userId } = req.query;
    const notifications = readJSON(NOTIFICATIONS_FILE);
    const userNotifications = notifications
        .filter(n => n.recipientId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(userNotifications);
};
