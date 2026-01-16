// Configuration API
const API_URL = 'http://localhost:3000/api';

// État de l'application
let currentUser = null;
let map = null;
let markers = {
    chantiers: [],
    agences: [],
    user: null
};
let currentPosition = null;
let chantiers = [];
let agences = [];
let selectedChantier = null;

// ============ INITIALISATION ============

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    checkSession();
});

function initEventListeners() {
    // Login
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    
    // Notifications
    document.getElementById('btn-notifications').addEventListener('click', toggleNotificationsPanel);
    document.querySelector('#notifications-panel .close-panel').addEventListener('click', toggleNotificationsPanel);
    
    // Signalement
    document.getElementById('btn-signal').addEventListener('click', openSignalModal);
    document.getElementById('btn-cancel-signal').addEventListener('click', closeSignalModal);
    document.getElementById('btn-submit-signal').addEventListener('click', submitSignal);
    document.getElementById('btn-refresh-location').addEventListener('click', refreshLocation);
    document.getElementById('signal-photo').addEventListener('change', handlePhotoChange);
    
    // Filtres
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleFilter(e.target.closest('.filter-btn')));
    });
    
    // Modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => modal.classList.add('hidden'));
        });
    });
}

function checkSession() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainScreen();
    }
}

// ============ AUTHENTIFICATION ============

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(currentUser));
            showMainScreen();
        } else {
            errorDiv.textContent = data.message;
        }
    } catch (error) {
        errorDiv.textContent = 'Erreur de connexion au serveur';
        console.error(error);
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('user');
    document.getElementById('main-screen').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
}

// ============ ÉCRAN PRINCIPAL ============

function showMainScreen() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    document.getElementById('user-name').textContent = currentUser.name;
    
    // Afficher le bouton de signalement pour les employés uniquement
    const signalBtn = document.getElementById('btn-signal');
    if (currentUser.role === 'employe') {
        signalBtn.classList.remove('hidden');
        signalBtn.style.display = 'flex';
    } else {
        signalBtn.classList.add('hidden');
        signalBtn.style.display = 'none';
    }
    
    initMap();
    loadData();
    loadNotifications();
}

// ============ CARTE ============

function initMap() {
    // Centre par défaut sur Marseille
    map = L.map('map').setView([43.2965, 5.3698], 10);
    
    // Style de carte épuré (CartoDB Positron)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
    }).addTo(map);
    
    // Obtenir la position de l'utilisateur
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentPosition = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                map.setView([currentPosition.lat, currentPosition.lon], 13);
                addUserMarker();
            },
            (error) => {
                console.log('Géolocalisation non disponible:', error);
                showToast('Géolocalisation non disponible', 'warning');
            }
        );
    }
}

function createMarkerIcon(type, status = '') {
    let className = `marker-icon marker-${type}`;
    if (status) className += ` ${status}`;
    
    let icon = 'fa-hard-hat';
    if (type === 'agence') icon = 'fa-building';
    if (type === 'user') icon = 'fa-user';
    
    return L.divIcon({
        className: 'custom-marker',
        html: `<div class="${className}"><i class="fas ${icon}"></i></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });
}

function addUserMarker() {
    if (markers.user) {
        map.removeLayer(markers.user);
    }
    
    if (currentPosition) {
        markers.user = L.marker([currentPosition.lat, currentPosition.lon], {
            icon: createMarkerIcon('user')
        }).addTo(map);
        markers.user.bindPopup('<strong>Ma position</strong>');
    }
}

function displayChantiers(filter = 'all') {
    // Supprimer les anciens marqueurs
    markers.chantiers.forEach(m => map.removeLayer(m));
    markers.chantiers = [];
    
    let filtered = chantiers;
    if (filter === 'nouveau' || filter === 'affecté') {
        filtered = chantiers.filter(c => c.status === filter);
    }
    
    // Si directeur, ne montrer que les chantiers de son agence
    if (currentUser.role === 'directeur') {
        filtered = filtered.filter(c => c.agenceId === currentUser.agenceId);
    }
    
    filtered.forEach(chantier => {
        const marker = L.marker([chantier.lat, chantier.lon], {
            icon: createMarkerIcon('chantier', chantier.status)
        }).addTo(map);
        
        marker.on('click', () => openChantierDetail(chantier));
        markers.chantiers.push(marker);
    });
}

function displayAgences() {
    markers.agences.forEach(m => map.removeLayer(m));
    markers.agences = [];
    
    agences.forEach(agence => {
        const marker = L.marker([agence.lat, agence.lon], {
            icon: createMarkerIcon('agence')
        }).addTo(map);
        
        marker.bindPopup(`
            <strong>${agence.name}</strong><br>
            ${agence.address}<br>
            <small>${agence.phone}</small>
        `);
        
        markers.agences.push(marker);
    });
}

// ============ DONNÉES ============

async function loadData() {
    try {
        const [chantiersRes, agencesRes] = await Promise.all([
            fetch(`${API_URL}/chantiers`),
            fetch(`${API_URL}/agences`)
        ]);
        
        chantiers = await chantiersRes.json();
        agences = await agencesRes.json();
        
        displayChantiers();
        displayAgences();
    } catch (error) {
        console.error('Erreur chargement données:', error);
        showToast('Erreur de chargement des données', 'error');
    }
}

async function loadNotifications() {
    try {
        const response = await fetch(`${API_URL}/notifications/${currentUser.id}`);
        const notifications = await response.json();
        
        const unreadCount = notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-badge');
        
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
        
        renderNotifications(notifications);
    } catch (error) {
        console.error('Erreur chargement notifications:', error);
    }
}

function renderNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    
    if (notifications.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucune notification</p>';
        return;
    }
    
    container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.read ? '' : 'unread'}" data-id="${notif.id}" data-chantier="${notif.chantierId}">
            <div>${notif.message}</div>
            <div class="time">${formatDate(notif.createdAt)}</div>
        </div>
    `).join('');
    
    container.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async () => {
            const chantierId = item.dataset.chantier;
            const notifId = item.dataset.id;
            
            // Marquer comme lue
            await fetch(`${API_URL}/notifications/${notifId}/read`, { method: 'PUT' });
            item.classList.remove('unread');
            
            // Ouvrir le chantier
            const chantier = chantiers.find(c => c.id === chantierId);
            if (chantier) {
                toggleNotificationsPanel();
                map.setView([chantier.lat, chantier.lon], 15);
                openChantierDetail(chantier);
            }
            
            loadNotifications();
        });
    });
}

// ============ FILTRES ============

function handleFilter(btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const filter = btn.dataset.filter;
    
    if (filter === 'agences') {
        markers.chantiers.forEach(m => map.removeLayer(m));
        displayAgences();
    } else {
        displayChantiers(filter);
        displayAgences();
    }
}

// ============ SIGNALEMENT ============

function openSignalModal() {
    document.getElementById('signal-modal').classList.remove('hidden');
    document.getElementById('proximity-warning').classList.add('hidden');
    document.getElementById('signal-description').value = '';
    document.getElementById('photo-preview').style.backgroundImage = '';
    document.getElementById('photo-preview').classList.remove('has-image');
    
    refreshLocation();
}

function closeSignalModal() {
    document.getElementById('signal-modal').classList.add('hidden');
}

async function refreshLocation() {
    const coordsSpan = document.getElementById('signal-coords');
    const nearestDiv = document.getElementById('nearest-agence');
    const warningDiv = document.getElementById('proximity-warning');
    
    coordsSpan.textContent = 'Chargement...';
    nearestDiv.textContent = 'Recherche...';
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                currentPosition = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                
                coordsSpan.textContent = `${currentPosition.lat.toFixed(6)}, ${currentPosition.lon.toFixed(6)}`;
                
                // Vérifier proximité
                try {
                    const checkRes = await fetch(`${API_URL}/chantiers/check-proximity?lat=${currentPosition.lat}&lon=${currentPosition.lon}`);
                    const checkData = await checkRes.json();
                    
                    if (checkData.exists) {
                        warningDiv.classList.remove('hidden');
                        warningDiv.querySelector('span').textContent = checkData.message;
                    } else {
                        warningDiv.classList.add('hidden');
                    }
                    
                    // Agence la plus proche
                    const agencesRes = await fetch(`${API_URL}/agences/nearby?lat=${currentPosition.lat}&lon=${currentPosition.lon}`);
                    const nearbyAgences = await agencesRes.json();
                    
                    if (nearbyAgences.length > 0) {
                        nearestDiv.innerHTML = `
                            <strong>${nearbyAgences[0].name}</strong><br>
                            <small>${nearbyAgences[0].distance.toFixed(1)} km</small>
                        `;
                    }
                } catch (error) {
                    console.error(error);
                }
            },
            (error) => {
                coordsSpan.textContent = 'Position non disponible';
                showToast('Impossible d\'obtenir la position GPS', 'error');
            },
            { enableHighAccuracy: true }
        );
    }
}

function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('photo-preview');
            preview.style.backgroundImage = `url(${event.target.result})`;
            preview.classList.add('has-image');
        };
        reader.readAsDataURL(file);
    }
}

async function submitSignal() {
    if (!currentPosition) {
        showToast('Position GPS requise', 'error');
        return;
    }
    
    const description = document.getElementById('signal-description').value;
    const photoInput = document.getElementById('signal-photo');
    
    const formData = new FormData();
    formData.append('lat', currentPosition.lat);
    formData.append('lon', currentPosition.lon);
    formData.append('description', description);
    formData.append('reportedBy', currentUser.id);
    formData.append('reportedByName', currentUser.name);
    
    if (photoInput.files[0]) {
        formData.append('photo', photoInput.files[0]);
    }
    
    try {
        const response = await fetch(`${API_URL}/chantiers`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeSignalModal();
            showToast('Chantier signalé avec succès !', 'success');
            loadData();
            
            // Centrer sur le nouveau chantier
            map.setView([data.chantier.lat, data.chantier.lon], 15);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Erreur lors du signalement', 'error');
    }
}

// ============ DÉTAIL CHANTIER ============

function openChantierDetail(chantier) {
    selectedChantier = chantier;
    
    const detailDiv = document.getElementById('chantier-detail');
    const actionsDiv = document.getElementById('chantier-actions');
    
    detailDiv.innerHTML = `
        <div class="chantier-info">
            ${chantier.photo ? `<img src="${chantier.photo}" class="chantier-photo" alt="Photo du chantier">` : ''}
            
            <div>
                <span class="chantier-status ${chantier.status}">
                    <i class="fas ${chantier.status === 'nouveau' ? 'fa-star' : 'fa-check'}"></i>
                    ${chantier.status === 'nouveau' ? 'Nouveau' : 'Affecté'}
                </span>
            </div>
            
            <div class="info-row">
                <i class="fas fa-map-marker-alt"></i>
                <div>
                    <div class="label">Position GPS</div>
                    <div class="value">${chantier.lat.toFixed(6)}, ${chantier.lon.toFixed(6)}</div>
                </div>
            </div>
            
            <div class="info-row">
                <i class="fas fa-building"></i>
                <div>
                    <div class="label">Agence</div>
                    <div class="value">${chantier.agenceName || 'Non assignée'}</div>
                </div>
            </div>
            
            <div class="info-row">
                <i class="fas fa-user"></i>
                <div>
                    <div class="label">Signalé par</div>
                    <div class="value">${chantier.reportedByName}</div>
                </div>
            </div>
            
            <div class="info-row">
                <i class="fas fa-calendar"></i>
                <div>
                    <div class="label">Date</div>
                    <div class="value">${formatDate(chantier.reportedAt)}</div>
                </div>
            </div>
            
            ${chantier.assignedToName ? `
                <div class="info-row">
                    <i class="fas fa-user-tie"></i>
                    <div>
                        <div class="label">Affecté à</div>
                        <div class="value">${chantier.assignedToName}</div>
                    </div>
                </div>
            ` : ''}
            
            ${chantier.description ? `
                <div class="info-row">
                    <i class="fas fa-align-left"></i>
                    <div>
                        <div class="label">Description</div>
                        <div class="value">${chantier.description}</div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    // Actions selon le rôle
    actionsDiv.innerHTML = '';
    
    if (currentUser.role === 'directeur' && chantier.status === 'nouveau' && chantier.agenceId === currentUser.agenceId) {
        actionsDiv.innerHTML = `
            <button class="btn-primary" onclick="openAssignModal()">
                <i class="fas fa-user-plus"></i> Affecter à un ATS
            </button>
        `;
    }
    
    document.getElementById('chantier-modal').classList.remove('hidden');
}

async function openAssignModal() {
    document.getElementById('chantier-modal').classList.add('hidden');
    document.getElementById('assign-modal').classList.remove('hidden');
    
    const atsList = document.getElementById('ats-list');
    atsList.innerHTML = '<p>Chargement...</p>';
    
    try {
        const response = await fetch(`${API_URL}/agences/${currentUser.agenceId}/ats`);
        const ats = await response.json();
        
        if (ats.length === 0) {
            atsList.innerHTML = '<p class="empty-message">Aucun ATS disponible</p>';
            return;
        }
        
        atsList.innerHTML = ats.map(a => `
            <div class="ats-item" data-id="${a.id}" data-name="${a.name}">
                <i class="fas fa-user-tie"></i>
                <div>
                    <div class="ats-name">${a.name}</div>
                    <div class="ats-email">${a.email}</div>
                </div>
            </div>
        `).join('');
        
        atsList.querySelectorAll('.ats-item').forEach(item => {
            item.addEventListener('click', () => assignChantier(item.dataset.id, item.dataset.name));
        });
    } catch (error) {
        console.error(error);
        atsList.innerHTML = '<p class="empty-message">Erreur de chargement</p>';
    }
}

async function assignChantier(atsId, atsName) {
    try {
        const response = await fetch(`${API_URL}/chantiers/${selectedChantier.id}/assign`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ atsId, atsName })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('assign-modal').classList.add('hidden');
            showToast(`Chantier affecté à ${atsName}`, 'success');
            loadData();
        }
    } catch (error) {
        console.error(error);
        showToast('Erreur lors de l\'affectation', 'error');
    }
}

// ============ NOTIFICATIONS PANEL ============

function toggleNotificationsPanel() {
    const panel = document.getElementById('notifications-panel');
    panel.classList.toggle('active');
}

// ============ UTILITAIRES ============

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
