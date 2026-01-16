const { readJSON, USERS_FILE, setCorsHeaders } = require('../utils/helpers');

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
    const user = users.find(u => u.id === id);
    
    if (user) {
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } else {
        res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
};
