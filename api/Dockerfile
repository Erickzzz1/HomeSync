# Dockerfile para Google Cloud Run
FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código de la aplicación
COPY . .

# Exponer puerto (Cloud Run usa PORT automáticamente)
EXPOSE 8080

# Comando para iniciar
CMD ["node", "src/server.js"]


