const { 
    readJSON, 
    writeJSON,
    CHANTIERS_FILE, 
    NOTIFICATIONS_FILE,
    setCorsHeaders,
    checkNearbyChantier,
    findNearestAgence
} = require('../utils/helpers');

module.exports = (req, res) => {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method === 'GET') {
        const chantiers = readJSON(CHANTIERS_FILE);
        return res.json(chantiers);
    }
    
    if (req.method === 'POST') {
        const { lat, lon, description, reportedBy, reportedByName, photo } = req.body;
        const chantiers = readJSON(CHANTIERS_FILE);
        
        // Vérifier proximité
        const nearbyChantier = checkNearbyChantier(parseFloat(lat), parseFloat(lon));
        if (nearbyChantier) {
            return res.status(400).json({
                success: false,
                message: 'Un chantier existe déjà à proximité',
                existingChantier: nearbyChantier
            });
        }
        
        // Trouver l'agence la plus proche
        const nearestAgence = findNearestAgence(parseFloat(lat), parseFloat(lon));
        
        const newChantier = {
            id: 'CH' + Date.now(),
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            description,
            photo: photo || null,
            reportedBy,
            reportedByName,
            reportedAt: new Date().toISOString(),
            status: 'nouveau',
            agenceId: nearestAgence?.id || null,
            agenceName: nearestAgence?.name || null,
            assignedTo: null,
            assignedToName: null
        };
        
        chantiers.push(newChantier);
        writeJSON(CHANTIERS_FILE, chantiers);
        
        // Créer notification pour le directeur
        if (nearestAgence) {
            const notifications = readJSON(NOTIFICATIONS_FILE);
            notifications.push({
                id: 'N' + Date.now(),
                type: 'nouveau_chantier',
                chantierId: newChantier.id,
                recipientId: nearestAgence.directeurId,
                message: `Nouveau chantier signalé par ${reportedByName}`,
                read: false,
                createdAt: new Date().toISOString()
            });
            writeJSON(NOTIFICATIONS_FILE, notifications);
        }
        
        return res.json({ 
            success: true, 
            chantier: newChantier,
            nearestAgence
        });
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
};
