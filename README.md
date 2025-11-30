# 🏠 HomeSync - Asistente Digital del Hogar

> Aplicación móvil multiplataforma desarrollada con React Native, API Backend y Firebase para el Segundo Parcial

## 📋Descripción

HomeSync es una aplicación de asistente digital del hogar que implementa autenticación segura y gestión de tareas utilizando una arquitectura de API backend que gestiona Firebase. La aplicación sigue los principios de arquitectura MVVM con patrones de diseño profesionales.

### Características Implementadas

- **Autenticación Completa**: Registro e inicio de sesión a través de API backend
- **Gestión de Tareas**: CRUD completo de tareas del hogar
- **Arquitectura MVVM**: Separación clara de responsabilidades
- **Repository Pattern**: Abstracción de la capa de datos
- **API Backend**: Servidor Express que gestiona Firebase
- **Redux Toolkit**: Manejo de estado global eficiente
- **React Navigation**: Navegación fluida entre pantallas
- **Validaciones Seguras**: Validación exhaustiva de entradas
- **Comunicación Cifrada**: HTTPS por defecto
- **Gestión de Tokens**: Manejo seguro de sesiones con JWT
- **Variables de Entorno**: Protección de credenciales sensibles

## Tecnologías Utilizadas

### Frontend (App Móvil)
- **Framework**: React Native con Expo
- **Lenguaje**: TypeScript
- **Estado Global**: Redux Toolkit
- **Navegación**: React Navigation v6
- **Persistencia**: AsyncStorage
- **Cliente HTTP**: Fetch API

### Backend (API)
- **Framework**: Node.js con Express
- **Lenguaje**: JavaScript (ES Modules)
- **Base de Datos**: Firebase Firestore
- **Autenticación**: Firebase Authentication
- **Middleware**: CORS, Autenticación JWT

## 📁 Estructura del Proyecto

```
HomeSync/
├── api/                          # Backend API (Node.js/Express)
│   ├── src/
│   │   ├── config/
│   │   │   └── firebase.js      # Configuración de Firebase
│   │   ├── controllers/
│   │   │   ├── authController.js # Controlador de autenticación
│   │   │   └── taskController.js # Controlador de tareas
│   │   ├── middleware/
│   │   │   └── auth.js          # Middleware de autenticación
│   │   ├── routes/
│   │   │   ├── authRoutes.js    # Rutas de autenticación
│   │   │   └── taskRoutes.js    # Rutas de tareas
│   │   └── server.js            # Servidor Express
│   ├── package.json
│   ├── .env.example
│   └── README.md
├── src/
│   ├── services/
│   │   └── ApiService.ts        # Cliente HTTP para la API
│   ├── repositories/
│   │   ├── interfaces/
│   │   │   ├── IAuthRepository.ts
│   │   │   └── ITaskRepository.ts
│   │   ├── AuthRepository.ts
│   │   └── TaskRepository.ts
│   ├── viewmodels/
│   │   ├── AuthViewModel.ts
│   │   └── TaskViewModel.ts
│   ├── views/
│   │   └── screens/
│   │       ├── LoadingScreen.tsx
│   │       ├── LoginScreen.tsx
│   │       ├── RegisterScreen.tsx
│   │       ├── HomeScreen.tsx
│   │       ├── TaskListScreen.tsx
│   │       ├── TaskDetailScreen.tsx
│   │       └── CreateTaskScreen.tsx
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── store/
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   └── taskSlice.ts
│   │   ├── store.ts
│   │   └── hooks.ts
│   └── models/
│       └── TaskModel.ts
├── App.tsx
├── package.json
├── .env.example
├── API_SETUP.md
└── README.md
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js (v16 o superior)
- npm o yarn
- Expo CLI: `npm install -g expo-cli`
- Cuenta de Firebase

### Paso 1: Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd HomeSync
```

### Paso 2: Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita **Authentication** con el proveedor de Email/Password
4. Habilita **Firestore Database**
5. Ve a **Configuración del Proyecto** → **General**
6. En "Tus aplicaciones", agrega una aplicación web y copia las credenciales

### Paso 3: Configurar la API Backend

1. Navega a la carpeta `api`:
```bash
cd api
```

2. Instala las dependencias:
```bash
npm install
```

3. Copia `.env.example` a `.env`:
```bash
cp .env.example .env
```

4. Edita el archivo `.env` con tus credenciales de Firebase:
```env
FIREBASE_API_KEY=tu_api_key_aqui
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

PORT=3000
API_BASE_URL=http://localhost:3000
```

5. Inicia el servidor de la API:
```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

### Paso 4: Configurar la App Móvil

1. Vuelve a la raíz del proyecto:
```bash
cd ..
```

2. Instala las dependencias:
```bash
npm install
```

3. Copia `.env.example` a `.env`:
```bash
cp .env.example .env
```

4. Edita el archivo `.env` con tus credenciales:
```env
# Firebase Configuration (se mantiene por compatibilidad)
FIREBASE_API_KEY=tu_api_key_aqui
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# API Configuration
API_BASE_URL=http://localhost:3000
```

**Nota para dispositivos físicos/emuladores:**
- **Android Emulator**: Usa `http://10.0.2.2:3000` en lugar de `localhost`
- **iOS Simulator**: Usa `http://localhost:3000`
- **Dispositivo físico**: Usa la IP de tu computadora, ej: `http://192.168.1.100:3000`

### Paso 5: Ejecutar la Aplicación

**Terminal 1 - API Backend:**
```bash
cd api
npm run dev
```

**Terminal 2 - App Móvil:**
```bash
# En la raíz del proyecto
npm start

# O directamente en plataformas específicas:
npm run android  # Para Android
npm run ios      # Para iOS (solo en macOS)
npm run web      # Para navegador web
```

**IMPORTANTE**: Nunca subas los archivos `.env` al repositorio. Ya están incluidos en `.gitignore`.

## 🔐 Principios de Codificación Segura Implementados

### 1. Validación de Entradas

- Validación de formato de email (regex)
- Longitud mínima de contraseña (6 caracteres)
- Verificación de coincidencia de contraseñas
- Validación de campos de tareas
- Sanitización de entradas antes de enviar a la API

### 2. Comunicación Segura

- Uso de HTTPS por defecto
- Certificados SSL gestionados automáticamente
- Sin comunicación no cifrada
- API backend como capa de seguridad adicional

### 3. Gestión de Tokens y Sesiones

- Tokens JWT gestionados por Firebase Authentication
- Persistencia segura con AsyncStorage
- Renovación automática de tokens
- Logout completo que invalida sesiones
- Middleware de autenticación en la API

### 4. Manejo de Errores

- Try-catch en todas las operaciones asíncronas
- Mensajes de error amigables al usuario
- No exposición de detalles técnicos
- Logging de errores para debugging
- Validación en cliente y servidor

### 5. Protección de Datos Sensibles

- Variables de entorno para credenciales
- Archivo `.env` en `.gitignore`
- Plantilla `.env.example` sin datos reales
- No hardcoding de credenciales en el código
- Separación de configuración entre app y API

## 📐 Patrones de Diseño Aplicados

### Repository Pattern

**Implementado en**: `AuthRepository.ts`, `TaskRepository.ts`

- Abstracción de la capa de datos
- Facilita testing y mantenimiento
- Independencia del proveedor (API)
- Interfaz clara para operaciones

```typescript
interface IAuthRepository {
  signUp(data: SignUpData): Promise<AuthResult>;
  signIn(data: SignInData): Promise<AuthResult>;
  signOut(): Promise<AuthResult>;
}
```

### MVVM (Model-View-ViewModel)

- **Model**: `AuthRepository`, `TaskRepository` (interacción con API)
- **View**: Pantallas React Native (UI)
- **ViewModel**: `AuthViewModel.ts`, `TaskViewModel.ts` (lógica de presentación)

### Service Layer Pattern

**Implementado en**: `ApiService.ts`

- Centralización de comunicación HTTP
- Gestión automática de tokens
- Manejo consistente de errores
- Reutilización de código

## Arquitectura de la Aplicación

```
┌─────────────────────────────────────────┐
│         React Native App                 │
│  ┌──────────┐  ┌──────────┐            │
│  │  Views   │  │ ViewModels│            │
│  └────┬─────┘  └─────┬─────┘            │
│       │              │                   │
│  ┌────▼─────────────▼─────┐            │
│  │    Repositories         │            │
│  └──────────┬──────────────┘            │
│             │                            │
│  ┌──────────▼──────────┐                │
│  │    ApiService        │                │
│  └──────────┬──────────┘                │
└─────────────┼────────────────────────────┘
              │ HTTP/HTTPS
              │
┌─────────────▼────────────────────────────┐
│         API Backend (Express)             │
│  ┌──────────┐  ┌──────────┐            │
│  │ Routes   │  │Middleware │            │
│  └────┬─────┘  └─────┬─────┘            │
│       │              │                   │
│  ┌────▼─────────────▼─────┐            │
│  │    Controllers          │            │
│  └──────────┬──────────────┘            │
│             │                            │
└─────────────┼────────────────────────────┘
              │
┌─────────────▼────────────────────────────┐
│         Firebase                          │
│  ┌──────────┐  ┌──────────┐            │
│  │   Auth   │  │ Firestore │            │
│  └──────────┘  └───────────┘            │
└──────────────────────────────────────────┘
```

## Uso de la Aplicación

### Registro de Usuario

1. Abre la aplicación
2. Toca "Crear Cuenta Nueva"
3. Completa el formulario:
   - Nombre (opcional)
   - Correo electrónico (requerido)
   - Contraseña (mínimo 6 caracteres)
   - Confirmar contraseña
4. Toca "Crear Cuenta"

### Inicio de Sesión

1. Ingresa tu correo y contraseña
2. Toca "Iniciar Sesión"
3. Serás redirigido a la pantalla principal

### Gestión de Tareas

1. Desde la pantalla principal, toca "Ver Mis Tareas"
2. Para crear una nueva tarea, toca el botón "+"
3. Completa el formulario:
   - Título (requerido)
   - Descripción (requerida)
   - Asignado a (requerido)
   - Fecha de vencimiento (requerida)
   - Prioridad (Alta, Media, Baja)
4. Toca "Crear Tarea"
5. Puedes editar, completar o eliminar tareas desde la lista

## Dependencias Principales

### App Móvil
```json
{
  "expo": "~49.0.0",
  "react-native": "0.72.6",
  "@react-navigation/native": "^6.1.9",
  "@reduxjs/toolkit": "^1.9.7",
  "react-redux": "^8.1.3",
  "@react-native-async-storage/async-storage": "1.18.2"
}
```

### API Backend
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "firebase": "^10.7.1"
}
```

## Solución de Problemas Comunes

### Error: "Network request failed"

**Solución**: 
1. Verifica que la API esté corriendo (`cd api && npm run dev`)
2. Verifica la URL en `.env` de la app
3. Para Android Emulator, usa `http://10.0.2.2:3000`
4. Para dispositivo físico, usa la IP de tu computadora

### Error: "Token inválido o expirado"

**Solución**: 
1. Cierra sesión y vuelve a iniciar sesión
2. Verifica que las credenciales de Firebase estén correctas en `api/.env`
3. Revisa los logs de la API

### La aplicación no se ejecuta

**Solución**:
```bash
# Limpiar caché de Expo
expo start -c

# Reinstalar dependencias
rm -rf node_modules
npm install
```

### La API no responde

**Solución**:
1. Verifica que el puerto 3000 no esté en uso
2. Revisa los logs de la API para errores
3. Verifica que Firebase esté configurado correctamente en `api/.env`

## 🌳 Estrategia de Versionamiento (Git)

### Estructura de Ramas

```
main/master              # Producción
  └── develop           # Desarrollo
      └── feature/*     # Features individuales
```

### Convenciones de Commits

Este proyecto sigue [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: nueva funcionalidad
fix: corrección de bug
docs: documentación
style: formato de código
refactor: refactorización
test: tests
chore: tareas de mantenimiento
```

### Ejemplos de Commits

```bash
feat: implement API backend with Express
feat: create ApiService for HTTP communication
feat: add task management functionality
fix: fix authentication token handling
docs: update README with API setup instructions
```

### Versionamiento Semántico

**Versión Actual**: `v0.1.0`

Formato: `MAJOR.MINOR.PATCH`

- **MAJOR**: Cambios incompatibles con versiones anteriores
- **MINOR**: Nueva funcionalidad compatible
- **PATCH**: Correcciones de bugs

## Documentación Adicional

- [API_SETUP.md](./API_SETUP.md) - Guía detallada de configuración de la API
- [api/README.md](./api/README.md) - Documentación completa de la API backend

## Autor

Desarrollado como parte del Segundo Parcial - Desarrollo de Aplicaciones Móviles

## Licencia

Este proyecto es de uso académico.

## Próximos Pasos

Para futuras iteraciones del proyecto:

- [ ] Implementar recuperación de contraseña
- [ ] Agregar autenticación con Google/Facebook
- [ ] Crear módulo de gestión de dispositivos del hogar
- [ ] Implementar notificaciones push
- [ ] Agregar tests unitarios y de integración
- [ ] Desplegar API en servidor de producción
- [ ] Desplegar app en Play Store / App Store

---

## Recursos Adicionales

- [Documentación de React Native](https://reactnative.dev/)
- [Documentación de Firebase](https://firebase.google.com/docs)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Navigation](https://reactnavigation.org/)
- [Expo Documentation](https://docs.expo.dev/)
- [Express.js Documentation](https://expressjs.com/)

---

**HomeSync** - Tu asistente digital del hogar
