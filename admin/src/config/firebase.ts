import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBd3aOrXSBldsn9GSMhjmZOBO29qq5-2rw",
  authDomain: "promotores-aviva-tu-negocio.firebaseapp.com",
  databaseURL: "https://promotores-aviva-tu-negocio-default-rtdb.firebaseio.com",
  projectId: "promotores-aviva-tu-negocio",
  storageBucket: "promotores-aviva-tu-negocio.firebasestorage.app",
  messagingSenderId: "256021991557",
  appId: "1:256021991557:android:07035c1e93de73026859ec"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Configurar provider para solo permitir dominios específicos
googleProvider.setCustomParameters({
  hd: 'avivacredito.com' // Solo permite cuentas del dominio @avivacredito.com
});

export default app;
