// Firebase Web Modular SDK Integration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  deleteDoc, 
  orderBy, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// TODO: Replace with your actual Firebase Project Configuration credentials
// Obtain these from Firebase Console -> Project Settings -> General -> Your apps -> Web app
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "pvkn-workshop.firebaseapp.com",
  projectId: "pvkn-workshop",
  storageBucket: "pvkn-workshop.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456789"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and Authentication services
const db = getFirestore(app);
const auth = getAuth(app);

export { 
  app, 
  db, 
  auth, 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  deleteDoc, 
  orderBy, 
  onSnapshot,
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
};
