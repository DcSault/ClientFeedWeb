const { readJSON, USERS_FILE, setCorsHeaders } = require('./utils/helpers');

module.exports = (req, res) => {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    const { email, password } = req.body;
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        const { password: pwd, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } else {
        res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }
};
