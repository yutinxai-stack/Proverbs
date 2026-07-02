import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD1rqPae9ieHEKGPO_jEFY5Vvo36T9g990",
  authDomain: "proverbs-web-913e7.firebaseapp.com",
  projectId: "proverbs-web-913e7",
  storageBucket: "proverbs-web-913e7.firebasestorage.app",
  messagingSenderId: "183268045694",
  appId: "1:183268045694:web:dad0b60d9752aaaeaeb92f"
};

// Check if config is using default placeholder values
export const isFirebaseConfigured = 
  !!firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY" && 
  firebaseConfig.apiKey.trim() !== "" &&
  !!firebaseConfig.projectId && 
  firebaseConfig.projectId !== "YOUR_PROJECT_ID";

let auth: any = {} as any;
let db: any = {} as any;

if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }
}

export { auth, db };
