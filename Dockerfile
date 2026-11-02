# Étape 1 : Construction du Frontend React/Vite
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . ./
RUN npm run build

# Étape 2 : Environnement Python & Pilote BLE
FROM python:3.12-slim

# Dépendances système pour BlueZ (Bluetooth Linux) et D-Bus
RUN apt-get update && apt-get install -y --no-install-recommends \
    bluez \
    dbus \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installation des dépendances Python
COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copie du serveur et du frontend compilé
COPY server/ ./server/
COPY --from=frontend-builder /app/dist ./dist

# Dossier pour la base de données persistante
RUN mkdir -p /app/data
ENV DATA_DIR=/app/data
ENV PORT=8080
ENV HOST=0.0.0.0

EXPOSE 8080

CMD ["python", "server/main.py"]
