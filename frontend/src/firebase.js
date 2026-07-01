import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBFyhlhtu3oTjtrxd3lNqUaQti0QDXMg6Q",
  authDomain: 'arkasystems-61e93.firebaseapp.com',
  projectId: "arkasystems-61e93",
  storageBucket: "arkasystems-61e93.firebasestorage.app",
  messagingSenderId: "793610509032",
  appId: "1:793610509032:web:5e151553c4c8d06b5f475d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, db };
