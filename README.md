# Union-Matériaux - Application de Signalement de Chantiers

Application mobile (maquette) permettant aux employés d'Union-Matériaux de signaler des chantiers via photo et position GPS.

## 🚀 Fonctionnalités

### Pour les Employés
- 📍 Signaler un chantier avec photo et position GPS
- 🗺️ Voir les chantiers existants sur une carte
- ⚠️ Alerte si un chantier existe déjà à proximité (< 200m)
- 🏢 Affichage de l'agence la plus proche

### Pour les Directeurs d'Agence
- 📬 Recevoir les notifications de nouveaux chantiers
- 👥 Affecter les chantiers aux ATS (Attachés Technico-Commerciaux)
- 📊 Voir les chantiers de son agence

### Pour les ATS
- 📋 Voir les chantiers qui leur sont affectés
- 🔔 Recevoir les notifications d'affectation

## 🛠️ Installation

### Développement local

```bash
# Installer les dépendances
npm install

# Lancer le serveur
npm start
```

L'application sera accessible sur : http://localhost:3000

### Déploiement Vercel

```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer
vercel
```

L'application est compatible avec Vercel et utilise des Serverless Functions pour l'API.

## 👤 Comptes de Test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Employé | employe@union-materiaux.fr | test123 |
| Directeur Marseille | directeur.marseille@union-materiaux.fr | test123 |
| Directeur Aix | directeur.aix@union-materiaux.fr | test123 |
| Directeur Nice | directeur.nice@union-materiaux.fr | test123 |
| ATS Marseille | ats1.marseille@union-materiaux.fr | test123 |
| ATS Marseille | ats2.marseille@union-materiaux.fr | test123 |
| ATS Aix | ats1.aix@union-materiaux.fr | test123 |
| ATS Nice | ats1.nice@union-materiaux.fr | test123 |

## 📁 Structure du Projet

```
ClientFeed/
├── index.html             # Page principale
├── styles.css             # Styles CSS
├── app.js                 # Logique JavaScript frontend
├── server.js              # Serveur Express.js (dev local)
├── vercel.json            # Configuration Vercel
├── package.json           # Dépendances
├── api/                   # API Serverless (Vercel)
│   ├── utils/helpers.js   # Fonctions utilitaires
│   ├── login.js           # Authentification
│   ├── chantiers/         # Endpoints chantiers
│   ├── agences/           # Endpoints agences
│   └── notifications/     # Endpoints notifications
├── data/                  # Données JSON (simule la DB)
│   ├── users.json         # Utilisateurs
│   ├── agences.json       # Agences Union-Matériaux
│   ├── chantiers.json     # Chantiers signalés
│   └── notifications.json # Notifications
└── uploads/               # Photos des chantiers
```
    ├── index.html         # Page principale
    ├── styles.css         # Styles CSS
    └── app.js             # Logique JavaScript
```

## 🗺️ Agences Disponibles

- Union-Matériaux Marseille
- Union-Matériaux Aix-en-Provence
- Union-Matériaux Nice
- Union-Matériaux Toulon
- Union-Matériaux Avignon

## 📱 API Endpoints

### Authentification
- `POST /api/login` - Connexion

### Chantiers
- `GET /api/chantiers` - Liste des chantiers
- `GET /api/chantiers/nearby?lat=&lon=&radius=` - Chantiers à proximité
- `GET /api/chantiers/check-proximity?lat=&lon=` - Vérifier si chantier existant
- `POST /api/chantiers` - Créer un chantier (avec upload photo)
- `PUT /api/chantiers/:id/assign` - Affecter à un ATS

### Agences
- `GET /api/agences` - Liste des agences
- `GET /api/agences/nearby?lat=&lon=&radius=` - Agences proches
- `GET /api/agences/:id/ats` - ATS d'une agence
- `GET /api/agences/:id/chantiers` - Chantiers d'une agence

### Notifications
- `GET /api/notifications/:userId` - Notifications d'un utilisateur
- `PUT /api/notifications/:id/read` - Marquer comme lue

## 🎨 Design

- Interface épurée style carte
- Utilisation de Leaflet avec fond CartoDB Positron
- Couleurs : Rouge Union-Matériaux (#E53935)
- Responsive pour mobile

## 📝 Notes

Cette application est une **maquette** utilisant :
- Stockage JSON (pas de base de données)
- Comptes génériques de test
- Simulation des notifications (pas d'emails réels)
