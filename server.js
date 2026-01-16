const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configuration Multer pour les photos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Chemins des fichiers JSON
const DATA_PATH = './data';
const CHANTIERS_FILE = path.join(DATA_PATH, 'chantiers.json');
const USERS_FILE = path.join(DATA_PATH, 'users.json');
const AGENCES_FILE = path.join(DATA_PATH, 'agences.json');
const NOTIFICATIONS_FILE = path.join(DATA_PATH, 'notifications.json');

// Initialisation des dossiers et fichiers
function initData() {
    if (!fs.existsSync(DATA_PATH)) {
        fs.mkdirSync(DATA_PATH, { recursive: true });
    }
    if (!fs.existsSync('./uploads')) {
        fs.mkdirSync('./uploads', { recursive: true });
    }
}

// Helpers pour lire/écrire JSON
function readJSON(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (error) {
        console.error(`Erreur lecture ${filePath}:`, error);
    }
    return [];
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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

// ============ ROUTES API ============

// Authentification
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        const { password, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } else {
        res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }
});

// Récupérer les infos utilisateur
app.get('/api/user/:id', (req, res) => {
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.id === req.params.id);
    if (user) {
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } else {
        res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
});

// Récupérer tous les chantiers
app.get('/api/chantiers', (req, res) => {
    const chantiers = readJSON(CHANTIERS_FILE);
    res.json(chantiers);
});

// Récupérer les chantiers à proximité
app.get('/api/chantiers/nearby', (req, res) => {
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
});

// Vérifier si un chantier existe à proximité
app.get('/api/chantiers/check-proximity', (req, res) => {
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
});

// Créer un nouveau chantier
app.post('/api/chantiers', upload.single('photo'), (req, res) => {
    const { lat, lon, description, reportedBy, reportedByName } = req.body;
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
        photo: req.file ? `/uploads/${req.file.filename}` : null,
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
    
    res.json({ 
        success: true, 
        chantier: newChantier,
        nearestAgence
    });
});

// Affecter un chantier à un ATS
app.put('/api/chantiers/:id/assign', (req, res) => {
    const { atsId, atsName } = req.body;
    const chantiers = readJSON(CHANTIERS_FILE);
    
    const index = chantiers.findIndex(c => c.id === req.params.id);
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
});

// Récupérer les agences
app.get('/api/agences', (req, res) => {
    const agences = readJSON(AGENCES_FILE);
    res.json(agences);
});

// Récupérer les agences proches
app.get('/api/agences/nearby', (req, res) => {
    const { lat, lon, radius = 50 } = req.query;
    const nearby = findNearbyAgences(parseFloat(lat), parseFloat(lon), parseFloat(radius));
    res.json(nearby);
});

// Récupérer les ATS d'une agence
app.get('/api/agences/:id/ats', (req, res) => {
    const users = readJSON(USERS_FILE);
    const ats = users.filter(u => u.role === 'ats' && u.agenceId === req.params.id);
    res.json(ats.map(({ password, ...u }) => u));
});

// Récupérer les notifications d'un utilisateur
app.get('/api/notifications/:userId', (req, res) => {
    const notifications = readJSON(NOTIFICATIONS_FILE);
    const userNotifications = notifications
        .filter(n => n.recipientId === req.params.userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(userNotifications);
});

// Marquer notification comme lue
app.put('/api/notifications/:id/read', (req, res) => {
    const notifications = readJSON(NOTIFICATIONS_FILE);
    const index = notifications.findIndex(n => n.id === req.params.id);
    if (index !== -1) {
        notifications[index].read = true;
        writeJSON(NOTIFICATIONS_FILE, notifications);
    }
    res.json({ success: true });
});

// Récupérer les chantiers d'une agence (pour directeur)
app.get('/api/agences/:id/chantiers', (req, res) => {
    const chantiers = readJSON(CHANTIERS_FILE);
    const agenceChantiers = chantiers.filter(c => c.agenceId === req.params.id);
    res.json(agenceChantiers);
});

// Démarrer le serveur
initData();
app.listen(PORT, () => {
    console.log(`🚀 Serveur Union-Matériaux démarré sur http://localhost:${PORT}`);
    console.log('📁 Données stockées dans ./data');
    console.log('📸 Photos stockées dans ./uploads');
});
