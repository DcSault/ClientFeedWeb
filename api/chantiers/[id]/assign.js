const { 
    readJSON, 
    writeJSON, 
    CHANTIERS_FILE, 
    NOTIFICATIONS_FILE, 
    setCorsHeaders 
} = require('../../utils/helpers');

module.exports = (req, res) => {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    const { id } = req.query;
    const { atsId, atsName } = req.body;
    const chantiers = readJSON(CHANTIERS_FILE);
    
    const index = chantiers.findIndex(c => c.id === id);
    if (index === -1) {
        return res.status(404).json({ message: 'Chantier non trouvé' });
    }
    
    chantiers[index].assignedTo = atsId;
    chantiers[index].assignedToName = atsName;
    chantiers[index].status = 'affecté';
    chantiers[index].assignedAt = new Date().toISOString();
    
    writeJSON(CHANTIERS_FILE, chantiers);
    
    // Notification pour l'ATS
    const notifications = readJSON(NOTIFICATIONS_FILE);
    notifications.push({
        id: 'N' + Date.now(),
        type: 'chantier_affecte',
        chantierId: chantiers[index].id,
        recipientId: atsId,
        message: `Un nouveau chantier vous a été affecté`,
        read: false,
        createdAt: new Date().toISOString()
    });
    writeJSON(NOTIFICATIONS_FILE, notifications);
    
    res.json({ success: true, chantier: chantiers[index] });
};
