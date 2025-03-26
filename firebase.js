// Import the functions you need from the Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAGJhkroNCxglP4QGdyPzz-qsoQXPBrpsE",
  authDomain: "assispecialist-acdda.firebaseapp.com",
  projectId: "assispecialist-acdda",
  storageBucket: "assispecialist-acdda.appspot.com",
  messagingSenderId: "71362010976",
  appId: "1:71362010976:web:0104a54afa4b1c1f0d8805",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Storage
const db = getFirestore(app);
const storage = getStorage(app);

// Export the initialized services
export { db, storage };
