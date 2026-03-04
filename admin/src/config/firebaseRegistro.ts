import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Segunda instancia de Firebase para el proyecto de registro (check-ins)
// Las credenciales se cargan desde variables de entorno — NO incluir valores reales en este archivo.
// Configura las variables VITE_REGISTRO_* en tu archivo .env (no commitear).
const registroConfig = {
  apiKey: import.meta.env.VITE_REGISTRO_API_KEY,
  authDomain: import.meta.env.VITE_REGISTRO_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_REGISTRO_PROJECT_ID,
  storageBucket: import.meta.env.VITE_REGISTRO_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_REGISTRO_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_REGISTRO_APP_ID,
};

const registroApp =
  getApps().find((app) => app.name === 'registro') ||
  initializeApp(registroConfig, 'registro');

export const dbRegistro = getFirestore(registroApp);
