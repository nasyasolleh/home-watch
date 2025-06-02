// Firebase configuration
// Replace these values with your actual Firebase config
// const firebaseConfig = {
//     apiKey: "AIzaSyBlS5_t9mL7wOrtjaENqZLZMW78Drwa0AA",
//     authDomain: "fypdatabase-c8728.firebaseapp.com",
//     databaseURL: "https://fypdatabase-c8728.firebaseio.com",
//     projectId: "fypdatabase-c8728",
//     storageBucket: "fypdatabase-c8728.appspot.com",
//     messagingSenderId: "894982810977",
//     appId: "1:894982810977:web:29113e5d2c2567cdeda920",
//     measurementId: "G-TKPG54W2DS"
// };

const firebaseConfig = {
  apiKey: "AIzaSyD6cjEQ-ljbUX9S5IzHyMXpxQm9KNM-OoA",
  authDomain: "home-watch-dfe87.firebaseapp.com",
  projectId: "home-watch-dfe87",
  storageBucket: "home-watch-dfe87.firebasestorage.app",
  messagingSenderId: "53573656505",
  appId: "1:53573656505:web:4249ebd5a88c929a436068",
  measurementId: "G-74HLL3SWR5"
};

// For development/testing, you can also use Firebase emulators
// Uncomment the lines below if you want to use local emulators:
// import { connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
// import { connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
// 
// if (location.hostname === 'localhost') {
//     connectAuthEmulator(auth, "http://localhost:9099");
//     connectFirestoreEmulator(db, 'localhost', 8080);
// }

// Initialize Firebase using CDN imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';

let app;
let auth;
let db;
let storage;

try {
    console.log('Initializing Firebase...');
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    // Configure for better performance with ngrok/tunneling
    if (auth) {
        auth.useDeviceLanguage();
    }
    
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    // Fallback behavior
    auth = null;
    db = null;
    storage = null;
}

export { auth, db, storage };
