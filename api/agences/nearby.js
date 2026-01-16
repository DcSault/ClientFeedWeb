const { setCorsHeaders, findNearbyAgences } = require('../utils/helpers');

module.exports = (req, res) => {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    const { lat, lon, radius = 50 } = req.query;
    const nearby = findNearbyAgences(parseFloat(lat), parseFloat(lon), parseFloat(radius));
    res.json(nearby);
};
