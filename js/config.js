// Firebase configuration - Replace with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyBgBx2wtb3OlISGgIvkyAhL7GKNUp_KweM",
  authDomain: "carmangmanet.firebaseapp.com",
  projectId: "carmangmanet",
  storageBucket: "carmangmanet.firebasestorage.app",
  messagingSenderId: "994369419562",
  appId: "1:994369419562:web:1ef88d4505f80903fec653",
  measurementId: "G-91K9EXWNVC"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Export for use in other files
window.auth = auth;
window.db = db;
window.storage = storage;