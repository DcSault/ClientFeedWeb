const { readJSON, CHANTIERS_FILE, setCorsHeaders, calculateDistance } = require('../utils/helpers');

module.exports = (req, res) => {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    const { lat, lon, radius = 5 } = req.query;
    const chantiers = readJSON(CHANTIERS_FILE);
    
    const nearby = chantiers
        .map(chantier => ({
            ...chantier,
            distance: calculateDistance(parseFloat(lat), parseFloat(lon), chantier.lat, chantier.lon)
        }))
        .filter(chantier => chantier.distance <= parseFloat(radius))
        .sort((a, b) => a.distance - b.distance);
    
    res.json(nearby);
};
