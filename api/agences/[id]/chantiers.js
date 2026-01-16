const { readJSON, CHANTIERS_FILE, setCorsHeaders } = require('../../utils/helpers');

module.exports = (req, res) => {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    const { id } = req.query;
    const chantiers = readJSON(CHANTIERS_FILE);
    const agenceChantiers = chantiers.filter(c => c.agenceId === id);
    res.json(agenceChantiers);
};
