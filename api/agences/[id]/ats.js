const { readJSON, USERS_FILE, setCorsHeaders } = require('../../utils/helpers');

module.exports = (req, res) => {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    const { id } = req.query;
    const users = readJSON(USERS_FILE);
    const ats = users.filter(u => u.role === 'ats' && u.agenceId === id);
    res.json(ats.map(({ password, ...u }) => u));
};
