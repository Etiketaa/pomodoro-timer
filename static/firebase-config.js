/**
 * Firebase Configuration for Pomodoro Timer v2
 * Uses Firebase Auth + Firestore for user accounts and cloud sync
 */

// Firebase SDK imports (compat mode for simplicity)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, updateProfile } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Firebase project configuration
// TODO: Replace with your own Firebase config from console.firebase.google.com
const firebaseConfig = {
    apiKey: "AIzaSyDEXAMPLE-replace-with-your-key",
    authDomain: "pomodoro-timer-lofi.firebaseapp.com",
    projectId: "pomodoro-timer-lofi",
    storageBucket: "pomodoro-timer-lofi.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

export {
    auth,
    db,
    googleProvider,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp
};
