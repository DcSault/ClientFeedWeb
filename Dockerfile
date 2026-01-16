# Dockerfile pour ClientFeedWeb
FROM node:18-alpine

# Installer git pour cloner le repository
RUN apk add --no-cache git

# Définir le répertoire de travail
WORKDIR /app

# Cloner le repository GitHub
RUN git clone https://github.com/DcSault/ClientFeedWeb.git .

# Installer les dépendances
RUN npm install

# Créer les dossiers nécessaires
RUN mkdir -p data uploads

# Exposer le port (ajuster selon la configuration du serveur)
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "start"]
