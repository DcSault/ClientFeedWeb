const { readJSON, writeJSON, NOTIFICATIONS_FILE, setCorsHeaders } = require('../../utils/helpers');

module.exports = (req, res) => {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    const { id } = req.query;
    const notifications = readJSON(NOTIFICATIONS_FILE);
    const index = notifications.findIndex(n => n.id === id);
    
    if (index !== -1) {
        notifications[index].read = true;
        writeJSON(NOTIFICATIONS_FILE, notifications);
    }
    
    res.json({ success: true });
};
