/**
 * Firebase Configuration & Initialization
 * Brinca e Aprende - Agenda Berçário
 * 
 * Utiliza o SDK Modular Oficial do Firebase (v10) via CDN de alta velocidade.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ============================================================================
// CONFIGURAÇÃO DO PROJETO FIREBASE
// Substitua pelas credenciais do seu projeto Firebase Console
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAHJZmK4tgwx1gyIk16rwGTNPCP2CgA7xE",
  authDomain: "brinca-e-aprende-agenda.firebaseapp.com",
  projectId: "brinca-e-aprende-agenda",
  storageBucket: "brinca-e-aprende-agenda.firebasestorage.app",
  messagingSenderId: "1020185767163",
  appId: "1:1020185767163:web:a3762f16acc485424f945e",
  measurementId: "G-K2F6Z84LFM"
};

// ============================================================================
// LISTA OFICIAL DE CUIDADORES / EDUCADORES AUTORIZADOS (BACKEND)
// O painel de cuidador NÃO aceita auto-cadastro pelo site.
// Apenas os e-mails cadastrados aqui ou no banco de dados administrativo têm permissão de educador.
// ============================================================================
export const AUTHORIZED_CAREGIVERS = [
  {
    email: "admin@brincaeaprende.com.br",
    name: "Tia Carol (Educadora)",
    role: "admin",
    avatar: "👩‍🏫",
    turma: "Berçário 1 e 2"
  },
  {
    email: "diretoria@brincaeaprende.com.br",
    name: "Diretoria Brinca e Aprende",
    role: "admin",
    avatar: "🏫",
    turma: "Coordenação Geral"
  },
  {
    email: "educadora@brincaeaprende.com.br",
    name: "Tia Mariana (Educadora)",
    role: "admin",
    avatar: "👩‍🏫",
    turma: "Berçário 1"
  }
];

// Inicialização segura do Firebase
let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let isFirebaseConfigured = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  
  // Verifica se a chave não é a dummy inicial
  if (!firebaseConfig.apiKey.includes('DummyKey')) {
    isFirebaseConfigured = true;
  }
} catch (error) {
  console.warn("Aviso Firebase:", error.message);
}

export { 
  app, 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  isFirebaseConfigured,
  firebaseConfig
};

// Exporta globalmente para compatibilidade de módulos
window.FirebaseModule = {
  app,
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  AUTHORIZED_CAREGIVERS,
  isFirebaseConfigured,
  firebaseConfig
};

// Dispara evento para avisar scripts síncronos que o Firebase inicializou
try {
  window.dispatchEvent(new CustomEvent('firebase:ready', { detail: window.FirebaseModule }));
} catch (e) {
  console.warn('Erro ao disparar evento firebase:ready:', e);
}
