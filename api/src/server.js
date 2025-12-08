/**
 * Servidor Express para la API de HomeSync
 * 
 * Maneja todas las peticiones de autenticación y tareas,
 * conectándose a Firebase en el backend.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import familyRoutes from './routes/familyRoutes.js';
import familyGroupRoutes from './routes/familyGroupRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import groupNotificationRoutes from './routes/groupNotificationRoutes.js';
import './config/firebase.js'; // Inicializar Firebase

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
// Configuración de CORS para producción - permite todos los orígenes
app.use(cors({
  origin: '*', // Permite peticiones desde cualquier origen
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/family-groups', familyGroupRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/group-notifications', groupNotificationRoutes);

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'HomeSync API está funcionando',
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    errorCode: 'INTERNAL_SERVER_ERROR'
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor API corriendo en el puerto ${PORT}`);
  console.log(`Health check disponible en /health`);
});
