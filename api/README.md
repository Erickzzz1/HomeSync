# HomeSync API - Backend Server

> API backend desarrollada con Node.js y Express que gestiona la conexión con Firebase para la aplicación HomeSync

## Descripción

HomeSync API es el servidor backend que actúa como intermediario entre la aplicación móvil React Native y Firebase. Gestiona todas las operaciones de autenticación y gestión de tareas, proporcionando una capa de seguridad adicional y una arquitectura más escalable.

### Características Implementadas

- **Autenticación Completa**: Registro, inicio de sesión y gestión de usuarios
- **Gestión de Tareas**: CRUD completo de tareas del hogar
- **Middleware de Autenticación**: Verificación de tokens JWT
- **Validación de Datos**: Validación exhaustiva en servidor
- **Manejo de Errores**: Respuestas consistentes y amigables
- **CORS Habilitado**: Comunicación segura con la app móvil
- **Firebase Integration**: Conexión directa con Firebase Authentication y Firestore

## Tecnologías Utilizadas

- **Runtime**: Node.js
- **Framework**: Express.js
- **Base de Datos**: Firebase Firestore
- **Autenticación**: Firebase Authentication
- **Lenguaje**: JavaScript (ES Modules)
- **Variables de Entorno**: dotenv

## Estructura del Proyecto

```
api/
├── src/
│   ├── config/
│   │   └── firebase.js          # Configuración e inicialización de Firebase
│   ├── controllers/
│   │   ├── authController.js     # Lógica de autenticación
│   │   └── taskController.js     # Lógica de gestión de tareas
│   ├── middleware/
│   │   └── auth.js               # Middleware de verificación de tokens
│   ├── routes/
│   │   ├── authRoutes.js         # Rutas de autenticación
│   │   └── taskRoutes.js         # Rutas de tareas
│   └── server.js                  # Servidor Express principal
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Instalación y Configuración

### Prerrequisitos

- Node.js (v16 o superior)
- npm o yarn
- Cuenta de Firebase con proyecto configurado

### Paso 1: Instalar Dependencias

```bash
cd api
npm install
```

### Paso 2: Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Configuración del Proyecto** → **General**
4. En "Tus aplicaciones", copia las credenciales de la aplicación web

### Paso 3: Configurar Variables de Entorno

1. Copia el archivo `.env.example` a `.env`:
```bash
cp .env.example .env
```

2. Edita el archivo `.env` con tus credenciales de Firebase:
```env
# Firebase Configuration
FIREBASE_API_KEY=tu_api_key_aqui
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Server Configuration
PORT=3000
API_BASE_URL=http://localhost:3000
```

**IMPORTANTE**: Nunca subas el archivo `.env` al repositorio. Ya está incluido en `.gitignore`.

### Paso 4: Ejecutar el Servidor

#### Desarrollo (con auto-reload)
```bash
npm run dev
```

#### Producción
```bash
npm start
```

El servidor se ejecutará en `http://localhost:3000` por defecto.

## Endpoints de la API

### Autenticación

#### POST `/api/auth/signup`
Registra un nuevo usuario.

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "password": "password123",
  "displayName": "Nombre Usuario" // Opcional
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "uid": "user-id",
    "email": "usuario@example.com",
    "displayName": "Nombre Usuario",
    "emailVerified": false
  },
  "token": "jwt-token-here"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Este correo electrónico ya está registrado",
  "errorCode": "AUTH_ERROR"
}
```

#### POST `/api/auth/signin`
Inicia sesión con email y contraseña.

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "uid": "user-id",
    "email": "usuario@example.com",
    "displayName": "Nombre Usuario",
    "emailVerified": false
  },
  "token": "jwt-token-here"
}
```

#### POST `/api/auth/signout`
Cierra la sesión del usuario actual.

**Response:**
```json
{
  "success": true
}
```

#### GET `/api/auth/me`
Obtiene la información del usuario actual. **Requiere autenticación.**

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "user-id",
    "email": "usuario@example.com",
    "displayName": "Nombre Usuario",
    "emailVerified": false
  }
}
```

### Tareas

Todas las rutas de tareas requieren autenticación mediante el header `Authorization: Bearer <token>`.

#### POST `/api/tasks`
Crea una nueva tarea.

**Request Body:**
```json
{
  "title": "Título de la tarea",
  "description": "Descripción detallada",
  "assignedTo": "Nombre del asignado",
  "dueDate": "2024-12-31T23:59:59.000Z",
  "priority": "Alta" // "Alta", "Media" o "Baja"
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    "id": "task-id",
    "title": "Título de la tarea",
    "description": "Descripción detallada",
    "assignedTo": "Nombre del asignado",
    "dueDate": "2024-12-31T23:59:59.000Z",
    "priority": "Alta",
    "isCompleted": false,
    "createdBy": "user-id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET `/api/tasks`
Obtiene todas las tareas del usuario autenticado.

**Response:**
```json
{
  "success": true,
  "tasks": [
    {
      "id": "task-id",
      "title": "Título de la tarea",
      "description": "Descripción detallada",
      "assignedTo": "Nombre del asignado",
      "dueDate": "2024-12-31T23:59:59.000Z",
      "priority": "Alta",
      "isCompleted": false,
      "createdBy": "user-id",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET `/api/tasks/:taskId`
Obtiene una tarea específica por ID.

**Response:**
```json
{
  "success": true,
  "task": {
    "id": "task-id",
    "title": "Título de la tarea",
    // ... resto de campos
  }
}
```

#### PUT `/api/tasks/:taskId`
Actualiza una tarea existente.

**Request Body (todos los campos son opcionales):**
```json
{
  "title": "Nuevo título",
  "description": "Nueva descripción",
  "assignedTo": "Nuevo asignado",
  "dueDate": "2024-12-31T23:59:59.000Z",
  "priority": "Media",
  "isCompleted": true
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    // Tarea actualizada
  }
}
```

#### DELETE `/api/tasks/:taskId`
Elimina una tarea.

**Response:**
```json
{
  "success": true
}
```

#### PATCH `/api/tasks/:taskId/toggle`
Cambia el estado de completado de una tarea.

**Request Body:**
```json
{
  "isCompleted": true
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    // Tarea actualizada
  }
}
```

## Autenticación

### Cómo Funciona

1. El usuario se registra o inicia sesión mediante `/api/auth/signup` o `/api/auth/signin`
2. La API devuelve un token JWT en la respuesta
3. El cliente guarda el token localmente
4. Para peticiones protegidas, el cliente envía el token en el header:
   ```
   Authorization: Bearer <token>
   ```
5. El middleware `verifyToken` valida el token antes de permitir el acceso

### Middleware de Autenticación

El middleware `verifyToken` realiza las siguientes validaciones:

- Verifica que el header `Authorization` esté presente
- Extrae el token del formato `Bearer <token>`
- Decodifica y valida el token JWT
- Verifica que el token no haya expirado
- Agrega la información del usuario a `req.user`

### Códigos de Error de Autenticación

- `UNAUTHORIZED`: Token no proporcionado
- `INVALID_TOKEN`: Token inválido o malformado
- `TOKEN_EXPIRED`: Token expirado

## Validación de Datos

### Validaciones de Autenticación

- **Email**: Formato válido de email
- **Password**: Mínimo 6 caracteres
- **DisplayName**: Máximo 50 caracteres (opcional)

### Validaciones de Tareas

- **Title**: Requerido, 3-100 caracteres
- **Description**: Requerido, máximo 500 caracteres
- **AssignedTo**: Requerido, máximo 50 caracteres
- **DueDate**: Requerido, formato de fecha válido
- **Priority**: Debe ser "Alta", "Media" o "Baja"

## Manejo de Errores

La API utiliza un formato consistente para respuestas de error:

```json
{
  "success": false,
  "error": "Mensaje de error amigable",
  "errorCode": "ERROR_CODE"
}
```

### Códigos de Error Comunes

- `VALIDATION_ERROR`: Error de validación de datos
- `AUTH_ERROR`: Error de autenticación
- `NOT_FOUND`: Recurso no encontrado
- `PERMISSION_DENIED`: Sin permisos para la operación
- `NETWORK_ERROR`: Error de conexión
- `INTERNAL_SERVER_ERROR`: Error interno del servidor

## Seguridad

### Principios Implementados

1. **Validación en Servidor**: Todas las entradas se validan en el servidor
2. **Autenticación JWT**: Tokens seguros para autenticación
3. **Verificación de Permisos**: Los usuarios solo pueden acceder a sus propios recursos
4. **Sanitización de Datos**: Los datos se sanitizan antes de guardar en Firestore
5. **Variables de Entorno**: Credenciales sensibles en variables de entorno
6. **CORS Configurado**: Control de acceso desde orígenes específicos

### Mejoras Recomendadas para Producción

- Implementar rate limiting
- Usar Firebase Admin SDK con service account para verificación robusta de tokens
- Agregar logging estructurado
- Implementar monitoreo y alertas
- Configurar HTTPS en producción
- Agregar validación de entrada más estricta
- Implementar cache para consultas frecuentes

## Desarrollo

### Estructura de Código

- **Controllers**: Contienen la lógica de negocio
- **Routes**: Definen los endpoints y middlewares
- **Middleware**: Funciones que se ejecutan antes de los controllers
- **Config**: Configuración de servicios externos (Firebase)

### Agregar un Nuevo Endpoint

1. Crear el método en el controller correspondiente
2. Agregar la ruta en el archivo de rutas
3. Aplicar middleware de autenticación si es necesario
4. Documentar el endpoint en este README

### Ejemplo: Agregar Endpoint de Perfil

**Controller** (`src/controllers/userController.js`):
```javascript
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    // Lógica para obtener perfil
    res.json({ success: true, profile: {...} });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener perfil' });
  }
};
```

**Route** (`src/routes/userRoutes.js`):
```javascript
import { verifyToken } from '../middleware/auth.js';
import { getProfile } from '../controllers/userController.js';

router.get('/profile', verifyToken, getProfile);
```

## Solución de Problemas

### Error: "Faltan variables de entorno"

**Solución**: Verifica que el archivo `.env` esté configurado correctamente con todas las variables requeridas.

### Error: "Firebase not initialized"

**Solución**: Verifica que las credenciales de Firebase en `.env` sean correctas y que Firebase esté habilitado en tu proyecto.

### Error: "Port 3000 already in use"

**Solución**: 
1. Cambia el puerto en `.env`: `PORT=3001`
2. O detén el proceso que está usando el puerto 3000

### Error: "CORS policy"

**Solución**: La API ya tiene CORS habilitado. Si tienes problemas, verifica la configuración en `src/server.js`.

### La API no responde

**Solución**:
1. Verifica que el servidor esté corriendo
2. Revisa los logs para errores
3. Verifica que Firebase esté configurado correctamente
4. Prueba el endpoint `/health` para verificar que el servidor esté activo

## Testing

### Endpoint de Salud

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "HomeSync API está funcionando",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Probar Autenticación

```bash
# Registro
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Inicio de sesión
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## Dependencias

```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "firebase": "^10.7.1"
}
```

## Scripts Disponibles

- `npm start`: Inicia el servidor en modo producción
- `npm run dev`: Inicia el servidor en modo desarrollo con auto-reload

## Próximos Pasos

- [ ] Implementar Firebase Admin SDK para verificación robusta de tokens
- [ ] Agregar rate limiting
- [ ] Implementar logging estructurado
- [ ] Agregar tests unitarios y de integración
- [ ] Implementar cache para consultas frecuentes
- [ ] Agregar documentación con Swagger/OpenAPI
- [ ] Configurar CI/CD
- [ ] Desplegar en servidor de producción

## Recursos Adicionales

- [Express.js Documentation](https://expressjs.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Node.js Documentation](https://nodejs.org/docs/)

---

**HomeSync API** - Backend seguro y escalable para tu aplicación móvil
