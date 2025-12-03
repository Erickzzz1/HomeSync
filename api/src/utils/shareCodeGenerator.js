/**
 * Generador de ShareCode único
 * 
 * Genera un código alfanumérico de 6 caracteres (A-Z, 0-9)
 * para identificar usuarios sin usar su email.
 */

/**
 * Genera un shareCode aleatorio de 6 caracteres
 * @returns {string} Código alfanumérico de 6 caracteres
 */
export function generateShareCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  return code;
}

/**
 * Verifica si un shareCode ya existe en Firestore
 * @param {Firestore} firestore - Instancia de Firestore
 * @param {string} shareCode - Código a verificar
 * @returns {Promise<boolean>} true si existe, false si no
 */
export async function shareCodeExists(firestore, shareCode) {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('shareCode', '==', shareCode));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error al verificar shareCode:', error);
    // Si hay error, asumir que no existe para permitir continuar
    return false;
  }
}

/**
 * Genera un shareCode único (verifica que no exista)
 * @param {Firestore} firestore - Instancia de Firestore
 * @param {number} maxAttempts - Número máximo de intentos (default: 10)
 * @returns {Promise<string>} ShareCode único
 */
export async function generateUniqueShareCode(firestore, maxAttempts = 10) {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const code = generateShareCode();
    const exists = await shareCodeExists(firestore, code);
    
    if (!exists) {
      return code;
    }
    
    attempts++;
  }
  
  // Si después de maxAttempts no se encontró uno único, generar con timestamp
  // Esto es extremadamente improbable pero por seguridad
  const timestamp = Date.now().toString(36).toUpperCase().slice(-2);
  const randomPart = generateShareCode().slice(0, 4);
  return (randomPart + timestamp).slice(0, 6);
}

