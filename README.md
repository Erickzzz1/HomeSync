# 🏠 HomeSync - Asistente Digital del Hogar

> Aplicación móvil multiplataforma desarrollada con React Native y Firebase para el Segundo Parcial

## 📋 Descripción

HomeSync es una aplicación de asistente digital del hogar que implementa autenticación segura utilizando Firebase Authentication y sigue los principios de arquitectura MVVM con patrones de diseño profesionales.

### Características Implementadas

- ✅ **Autenticación Completa**: Registro e inicio de sesión con Firebase
- ✅ **Arquitectura MVVM**: Separación clara de responsabilidades
- ✅ **Singleton Pattern**: Conexión única y optimizada con Firebase
- ✅ **Repository Pattern**: Abstracción de la capa de datos
- ✅ **Redux Toolkit**: Manejo de estado global eficiente
- ✅ **React Navigation**: Navegación fluida entre pantallas
- ✅ **Validaciones Seguras**: Validación exhaustiva de entradas
- ✅ **Comunicación Cifrada**: HTTPS por defecto (Firebase SDK)
- ✅ **Gestión de Tokens**: Manejo seguro de sesiones con Firebase
- ✅ **Variables de Entorno**: Protección de credenciales sensibles

## 🛠️ Tecnologías Utilizadas

- **Framework**: React Native con Expo
- **Lenguaje**: TypeScript
- **Backend**: Firebase (Authentication & Firestore)
- **Estado Global**: Redux Toolkit
- **Navegación**: React Navigation v6
- **Persistencia**: AsyncStorage

## 📁 Estructura del Proyecto

```
HomeSync/
├── src/
│   ├── services/
│   │   └── FirebaseService.ts          # Singleton para Firebase
│   ├── repositories/
│   │   ├── interfaces/
│   │   │   └── IAuthRepository.ts      # Interfaz del repositorio
│   │   └── AuthRepository.ts           # Implementación del repositorio
│   ├── viewmodels/
│   │   └── AuthViewModel.ts            # Lógica de presentación
│   ├── views/
│   │   └── screens/
│   │       ├── LoadingScreen.tsx       # Pantalla de carga
│   │       ├── LoginScreen.tsx         # Pantalla de inicio de sesión
│   │       ├── RegisterScreen.tsx      # Pantalla de registro
│   │       └── HomeScreen.tsx          # Pantalla principal
│   ├── navigation/
│   │   └── AppNavigator.tsx            # Configuración de navegación
│   └── store/
│       ├── slices/
│       │   └── authSlice.ts            # Slice de autenticación
│       ├── store.ts                    # Configuración del store
│       └── hooks.ts                    # Hooks tipados de Redux
├── App.tsx                             # Punto de entrada
├── package.json                        # Dependencias
├── .env.example                        # Plantilla de variables de entorno
└── README.md                           # Este archivo
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

### Paso 2: Instalar Dependencias

```bash
npm install
# o
yarn install
```

### Paso 3: Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita **Authentication** con el proveedor de Email/Password
4. Habilita **Firestore Database**
5. Ve a **Configuración del Proyecto** → **General**
6. En "Tus aplicaciones", agrega una aplicación web y copia las credenciales

### Paso 4: Configurar Variables de Entorno

1. Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

2. Edita el archivo `.env` con tus credenciales de Firebase:

```env
FIREBASE_API_KEY=tu_api_key_aqui
FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu_proyecto_id
FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

⚠️ **IMPORTANTE**: Nunca subas el archivo `.env` al repositorio. Ya está incluido en `.gitignore`.

### Paso 5: Ejecutar la Aplicación

```bash
# Iniciar Expo
npm start

# O directamente en plataformas específicas:
npm run android  # Para Android
npm run ios      # Para iOS (solo en macOS)
npm run web      # Para navegador web
```

## 🔐 Principios de Codificación Segura Implementados

### 1. Validación de Entradas

- ✅ Validación de formato de email (regex)
- ✅ Longitud mínima de contraseña (6 caracteres)
- ✅ Verificación de coincidencia de contraseñas
- ✅ Validación de caracteres alfanuméricos en contraseña
- ✅ Sanitización de entradas antes de enviar a Firebase

### 2. Comunicación Segura

- ✅ Uso de HTTPS por defecto (Firebase SDK)
- ✅ Certificados SSL gestionados automáticamente
- ✅ Sin comunicación no cifrada

### 3. Gestión de Tokens y Sesiones

- ✅ Tokens JWT gestionados por Firebase Authentication
- ✅ Persistencia segura con AsyncStorage
- ✅ Renovación automática de tokens
- ✅ Logout completo que invalida sesiones

### 4. Manejo de Errores

- ✅ Try-catch en todas las operaciones asíncronas
- ✅ Mensajes de error amigables al usuario
- ✅ No exposición de detalles técnicos
- ✅ Logging de errores para debugging

### 5. Protección de Datos Sensibles

- ✅ Variables de entorno para credenciales
- ✅ Archivo `.env` en `.gitignore`
- ✅ Plantilla `.env.example` sin datos reales
- ✅ No hardcoding de credenciales en el código

## 📐 Patrones de Diseño Aplicados

### Singleton Pattern

**Implementado en**: `FirebaseService.ts`

- Una única instancia de conexión con Firebase
- Optimización de recursos
- Estado consistente en toda la aplicación

```typescript
const firebaseService = FirebaseService.getInstance();
```

### Repository Pattern

**Implementado en**: `AuthRepository.ts`

- Abstracción de la capa de datos
- Facilita testing y mantenimiento
- Independencia del proveedor (Firebase)

```typescript
interface IAuthRepository {
  signUp(data: SignUpData): Promise<AuthResult>;
  signIn(data: SignInData): Promise<AuthResult>;
  signOut(): Promise<AuthResult>;
}
```

### MVVM (Model-View-ViewModel)

- **Model**: `AuthRepository` (interacción con Firebase)
- **View**: `LoginScreen.tsx`, `RegisterScreen.tsx` (UI)
- **ViewModel**: `AuthViewModel.ts` (lógica de presentación)

## 🌳 Estrategia de Versionamiento (Git)

### Estructura de Ramas

```
main/master              # Producción
  └── develop           # Desarrollo
      └── feature/auth-firebase-integration  # Feature actual
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

### Ejemplos de Commits en Este Proyecto

```bash
feat: implement FirebaseService with Singleton Pattern
feat: create AuthRepository with Repository Pattern
feat: add LoginScreen with validation
fix: add password validation to register form
docs: update README with installation instructions
```

### Versionamiento Semántico

**Versión Actual**: `v0.1.0`

Formato: `MAJOR.MINOR.PATCH`

- **MAJOR**: Cambios incompatibles con versiones anteriores
- **MINOR**: Nueva funcionalidad compatible
- **PATCH**: Correcciones de bugs

### Crear un Tag de Versión

```bash
git tag -a v0.1.0 -m "Primera versión funcional con autenticación Firebase"
git push origin v0.1.0
```

## 📱 Uso de la Aplicación

### Registro de Usuario

1. Abre la aplicación
2. Toca "Crear Cuenta Nueva"
3. Completa el formulario:
   - Nombre (opcional)
   - Correo electrónico (requerido)
   - Contraseña (mínimo 6 caracteres con letras y números)
   - Confirmar contraseña
4. Toca "Crear Cuenta"

### Inicio de Sesión

1. Ingresa tu correo y contraseña
2. Toca "Iniciar Sesión"
3. Serás redirigido a la pantalla principal

### Características de Seguridad Visibles

- ❌ No permite contraseñas débiles
- ❌ Validación de formato de email
- ❌ Confirmación de contraseña obligatoria
- ✅ Mensajes de error claros y útiles
- ✅ Persistencia de sesión segura

## 🧪 Testing

Para probar la autenticación:

```bash
# Caso 1: Registro exitoso
Email: test@example.com
Password: Test123

# Caso 2: Email inválido (debe fallar)
Email: correo-invalido
Password: Test123

# Caso 3: Contraseña débil (debe fallar)
Email: test@example.com
Password: 123

# Caso 4: Contraseñas no coinciden (debe fallar)
Password: Test123
Confirm: Test456
```

## 📦 Dependencias Principales

```json
{
  "expo": "~49.0.0",
  "react-native": "0.72.6",
  "firebase": "^10.7.1",
  "@react-navigation/native": "^6.1.9",
  "@reduxjs/toolkit": "^1.9.7",
  "react-redux": "^8.1.3"
}
```

## 🐛 Solución de Problemas Comunes

### Error: "Firebase not initialized"

**Solución**: Verifica que el archivo `.env` esté configurado correctamente con todas las variables.

### Error: "Email already in use"

**Solución**: El correo ya está registrado. Usa otro correo o inicia sesión.

### Error: "Network request failed"

**Solución**: Verifica tu conexión a internet y que Firebase esté habilitado.

### La aplicación no se ejecuta

**Solución**:
```bash
# Limpiar caché de Expo
expo start -c

# Reinstalar dependencias
rm -rf node_modules
npm install
```

## 👨‍💻 Autor

Desarrollado como parte del Segundo Parcial - Desarrollo de Aplicaciones Móviles

## 📄 Licencia

Este proyecto es de uso académico.

## 🔮 Próximos Pasos

Para futuras iteraciones del proyecto:

- [ ] Implementar recuperación de contraseña
- [ ] Agregar autenticación con Google/Facebook
- [ ] Crear módulo de gestión de dispositivos del hogar
- [ ] Implementar notificaciones push
- [ ] Agregar tests unitarios y de integración
- [ ] Desplegar en Play Store / App Store

---

## 📚 Recursos Adicionales

- [Documentación de React Native](https://reactnative.dev/)
- [Documentación de Firebase](https://firebase.google.com/docs)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Navigation](https://reactnavigation.org/)
- [Expo Documentation](https://docs.expo.dev/)

---

**HomeSync** - Tu asistente digital del hogar 🏠✨

