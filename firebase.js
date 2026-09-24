import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBCANXmmegfiL9y6ROCSCW6jL7lX-ym2vs',
  authDomain: 'safeage-e314d.firebaseapp.com',
  projectId: 'safeage-e314d',
  storageBucket: 'safeage-e314d.firebasestorage.app',
  messagingSenderId: '160022282586',
  appId: '1:160022282586:web:2b6e04713a9b3f7889f363',
  measurementId: 'G-NMMXSEYQZJ',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
