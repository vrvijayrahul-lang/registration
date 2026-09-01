// Firebase Web Modular SDK Integration
//
// This file is tracked in git so Vercel (and any other git-based host) can
// serve it. The Firebase web API key is safe to expose publicly — it
// identifies the project, it does not authenticate users. Real access
// control lives in firestore.rules + Firebase Auth.
//
// If you need to rotate the key, edit it here and push.

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
  apiKey: "AIzaSyA_QLLUR_KeHrkt-EdM6HSFw_JMcYFZfmc",
  authDomain: "registrations-29eb8.firebaseapp.com",
  projectId: "registrations-29eb8",
  storageBucket: "registrations-29eb8.firebasestorage.app",
  messagingSenderId: "638950416576",
  appId: "1:638950416576:web:105268083e18a3cba48d25",
  measurementId: "G-K54QNCCNVP"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Analytics — public site only. Safe to call; the SDK no-ops in unsupported environments.
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
