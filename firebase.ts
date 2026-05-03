'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, getDocFromServer, getDocs, or, setLogLevel } from 'firebase/firestore';
// Lazy initialization
const firebaseConfig = {
  projectId: "btsuper-d8521",
  appId: "1:931735521781:web:c8f82a36de098baa9478bc",
  apiKey: "AIzaSyB8zCvS5ghU_ynW0h4_lv7Gy_kpznhglt0",
  authDomain: "btsuper-d8521.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "btsuper-d8521.firebasestorage.app",
  messagingSenderId: "931735521781",
  measurementId: ""
};

const getFirebaseApp = () => {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
};

export const auth = typeof window !== 'undefined' ? getAuth(getFirebaseApp()) : null as any;
export const db = typeof window !== 'undefined' ? getFirestore(getFirebaseApp()) : null as any;

export const getGoogleProvider = () => {
  return new GoogleAuthProvider();
};

// Test connection helper
export async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    const dbInstance = getFirestore(getFirebaseApp(), "(default)");
    await getDocFromServer(doc(dbInstance, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

export type OperationType = typeof OperationType[keyof typeof OperationType];

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = typeof window !== 'undefined' ? auth?.currentUser : null;
  const errInfo: any = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  try {
    const serialized = JSON.stringify(errInfo);
    console.error('Firestore Error: ', serialized);
    throw new Error(serialized);
  } catch (stringifyError) {
    const fallbackMessage = `Firestore Error at ${path} during ${operationType}: ${errInfo.error}`;
    console.error(fallbackMessage);
    // Use a very simple JSON to avoid recursive issues
    throw new Error(JSON.stringify({ error: "permission-denied", operationType, path }));
  }
}

export function cleanData(data: any): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map(item => cleanData(item));
  }
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const key in data) {
      if (data[key] !== undefined) {
        cleaned[key] = cleanData(data[key]);
      }
    }
    return cleaned;
  }
  return data;
}

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  or 
};
export type { User };
