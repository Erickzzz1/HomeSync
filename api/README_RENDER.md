# Configuración para Render.com

## Pasos para desplegar en Render.com

### 1. Configuración del Servicio en Render

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Clic en **"New +"** → **"Web Service"**
3. Conecta tu repositorio de GitHub
4. **Configuración importante:**
   - **Name**: `homesync-api` (o el nombre que prefieras)
   - **Root Directory**: `api` ⚠️ **MUY IMPORTANTE**
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Node Version**: `18` o `20` (recomendado)

### 2. Variables de Entorno

En la sección **"Environment"** del servicio, agrega:

```
FIREBASE_API_KEY=tu_api_key_aqui
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**NO agregues** `PORT` - Render lo asigna automáticamente.

### 3. Health Check

Render verificará automáticamente el endpoint `/health` que ya está configurado en tu servidor.

### 4. Después del Despliegue

Una vez desplegado, Render te dará una URL como:
```
https://homesync-api.onrender.com
```

Actualiza tu app móvil con esta URL en el archivo `.env`:
```
API_BASE_URL=https://homesync-api.onrender.com
```

## Solución de Problemas

### Error: "npm install failed"
- Verifica que el **Root Directory** esté configurado como `api`
- Verifica que el `package.json` esté en la carpeta `api/`

### Error: "Build succeeded but service crashed"
- Verifica que todas las variables de entorno estén configuradas
- Revisa los logs en Render Dashboard
- Verifica que el `startCommand` sea `npm start`

### Error: "Port already in use"
- No configures `PORT` manualmente, Render lo asigna automáticamente

