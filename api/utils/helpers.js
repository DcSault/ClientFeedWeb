const path = require('path');
const fs = require('fs');

// Chemins des fichiers JSON - utiliser __dirname pour Vercel
const DATA_PATH = path.join(__dirname, '..', '..', 'data');
const CHANTIERS_FILE = path.join(DATA_PATH, 'chantiers.json');
const USERS_FILE = path.join(DATA_PATH, 'users.json');
const AGENCES_FILE = path.join(DATA_PATH, 'agences.json');
const NOTIFICATIONS_FILE = path.join(DATA_PATH, 'notifications.json');

// Stockage en mémoire pour Vercel (lecture seule sur le filesystem)
let memoryStore = {
    chantiers: null,
    users: null,
    agences: null,
    notifications: null
};

// Helpers pour lire/écrire JSON
function readJSON(filePath) {
    try {
        // Déterminer le type de données
        const filename = path.basename(filePath, '.json');
        
        // Si déjà en mémoire, retourner
        if (memoryStore[filename] !== null) {
            return memoryStore[filename];
        }
        
        // Sinon, charger depuis le fichier
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            memoryStore[filename] = data;
            return data;
        }
    } catch (error) {
        console.error(`Erreur lecture ${filePath}:`, error);
    }
    return [];
}

function writeJSON(filePath, data) {
    try {
        // Déterminer le type de données
        const filename = path.basename(filePath, '.json');
        
        // Stocker en mémoire
        memoryStore[filename] = data;
        
        // Essayer d'écrire sur le filesystem (fonctionnera en local, pas sur Vercel)
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (writeError) {
            // Ignorer l'erreur d'écriture sur Vercel (lecture seule)
            console.log('Écriture filesystem ignorée (Vercel read-only)');
        }
    } catch (error) {
        console.error(`Erreur écriture ${filePath}:`, error);
    }
}

// Calcul distance entre deux points GPS (formule Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Trouver l'agence la plus proche
function findNearestAgence(lat, lon) {
    const agences = readJSON(AGENCES_FILE);
    let nearest = null;
    let minDistance = Infinity;
    
    agences.forEach(agence => {
        const distance = calculateDistance(lat, lon, agence.lat, agence.lon);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = { ...agence, distance };
        }
    });
    
    return nearest;
}

// Trouver les agences proches (dans un rayon de 50km)
function findNearbyAgences(lat, lon, radius = 50) {
    const agences = readJSON(AGENCES_FILE);
    return agences
        .map(agence => ({
            ...agence,
            distance: calculateDistance(lat, lon, agence.lat, agence.lon)
        }))
        .filter(agence => agence.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
}

// Vérifier si un chantier existe à proximité (200m)
function checkNearbyChantier(lat, lon, excludeId = null) {
    const chantiers = readJSON(CHANTIERS_FILE);
    const PROXIMITY_THRESHOLD = 0.2; // 200 mètres
    
    return chantiers.find(chantier => {
        if (excludeId && chantier.id === excludeId) return false;
        const distance = calculateDistance(lat, lon, chantier.lat, chantier.lon);
        return distance <= PROXIMITY_THRESHOLD;
    });
}

// CORS headers pour Vercel
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = {
    DATA_PATH,
    CHANTIERS_FILE,
    USERS_FILE,
    AGENCES_FILE,
    NOTIFICATIONS_FILE,
    readJSON,
    writeJSON,
    calculateDistance,
    findNearestAgence,
    findNearbyAgences,
    checkNearbyChantier,
    setCorsHeaders
};
