# Configuración de Firestore para HomeSync

## Problema Común: Error 500 al acceder a datos

Si estás recibiendo errores 500 al intentar obtener el shareCode o los familiares, probablemente es un problema de **permisos en Firestore**.

## Solución: Configurar Reglas de Firestore

### Opción 1: Reglas Permisivas (Solo para Desarrollo)

Ve a Firebase Console → Firestore Database → Rules y configura:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir todo para desarrollo (NO usar en producción)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ ADVERTENCIA:** Estas reglas permiten acceso completo. Solo úsalas en desarrollo.

### Opción 2: Reglas Seguras (Recomendado)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Colección de usuarios
    match /users/{userId} {
      // Permitir lectura y escritura al dueño del documento
      // Y permitir lectura a usuarios autenticados (para buscar por shareCode)
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Permitir creación de documentos (para registro)
      allow create: if request.auth != null;
    }
    
    // Colección de tareas
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Opción 3: Usar Firebase Admin SDK (Mejor para Producción)

Para producción, es mejor usar Firebase Admin SDK que bypass las reglas de seguridad. Esto requiere:

1. Instalar `firebase-admin`
2. Configurar service account
3. Actualizar el código del backend

## Verificar que el Documento Existe

Si el documento con ID `QuEfDmCFrXUDflYEbSKWomtf4Ce2` existe pero no tiene `shareCode`:

1. Ve a Firebase Console → Firestore Database
2. Busca el documento en la colección `users`
3. Verifica que tenga el campo `shareCode`
4. Si no lo tiene, el backend lo generará automáticamente la próxima vez que accedas

## Pasos para Configurar

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database** → **Rules**
4. Copia y pega las reglas de la Opción 2 (o Opción 1 solo para desarrollo)
5. Haz clic en **Publish**
6. Reinicia tu servidor de API

## Verificar Logs del Servidor

El backend ahora tiene logging mejorado. Revisa la consola del servidor para ver:
- Si el documento existe
- Si tiene shareCode
- Qué error específico está ocurriendo

