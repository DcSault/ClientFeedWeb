const { setCorsHeaders, checkNearbyChantier } = require('../utils/helpers');

module.exports = (req, res) => {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    const { lat, lon } = req.query;
    const nearbyChantier = checkNearbyChantier(parseFloat(lat), parseFloat(lon));
    
    if (nearbyChantier) {
        res.json({ 
            exists: true, 
            chantier: nearbyChantier,
            message: 'Un chantier existe déjà à moins de 200m de cette position'
        });
    } else {
        res.json({ exists: false });
    }
};
