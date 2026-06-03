import {
  getAnalytics,
  isSupported as isAnalyticsSupported,
  type Analytics,
} from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: 'poreia-c566a.firebaseapp.com',
  projectId: 'poreia-c566a',
  storageBucket: 'poreia-c566a.firebasestorage.app',
  messagingSenderId: '144348444177',
  appId: '1:144348444177:web:016f90c82a6f3dece2e3b0',
  measurementId: 'G-6HE0ZT95LS',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const analyticsPromise: Promise<Analytics | null> =
  typeof window === 'undefined'
    ? Promise.resolve(null)
    : isAnalyticsSupported().then((supported) =>
      supported ? getAnalytics(firebaseApp) : null,
    );

export const signInWithGoogle = async () => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim()) {
    throw new Error('Missing NEXT_PUBLIC_FIREBASE_API_KEY in .env.local');
  }

  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error ? String(error.code) : '';

    if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw error;
  }
};

export const signOutUser = () => signOut(auth);
