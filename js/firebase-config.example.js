// Firebase Web Modular SDK Integration
//
// ⚠️  THIS IS A TEMPLATE. The real config lives in `firebase-config.js`,
// which is gitignored. Copy this file to `firebase-config.js` and fill in
// your project's values from:
//   Firebase Console → Project Settings → General → Your apps → Web app

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
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
  onSnapshot,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "1:YOUR_SENDER_ID:web:YOUR_APP_ID",
  measurementId: "G-YOUR_MEASUREMENT_ID"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Analytics — public site only. The SDK no-ops in unsupported environments.
const analytics = getAnalytics(app);

// Initialize Cloud Firestore and Authentication services
const db = getFirestore(app);
const auth = getAuth(app);

export {
  app,
  analytics,
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
  runTransaction,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
