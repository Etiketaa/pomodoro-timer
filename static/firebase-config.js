/**
 * Firebase Configuration for Pomodoro Timer v2
 * Uses Firebase Auth + Firestore for user accounts and cloud sync
 */

// Firebase SDK imports (compat mode for simplicity)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, updateProfile } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, onSnapshot, addDoc, orderBy, limit, Timestamp, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Firebase project configuration
// TODO: Replace with your own Firebase config from console.firebase.google.com
const firebaseConfig = {
    apiKey: "AIzaSyAWObsXTGEXbGKEDYWme3scyySkr5BTiIc",
    authDomain: "pomodoro-timer-lofi.firebaseapp.com",
    projectId: "pomodoro-timer-lofi",
    storageBucket: "pomodoro-timer-lofi.firebasestorage.app",
    messagingSenderId: "138832131671",
    appId: "1:138832131671:web:2b2a7290254dcca26dd512"
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
    serverTimestamp,
    onSnapshot,
    addDoc,
    orderBy,
    limit,
    Timestamp,
    deleteDoc
};
