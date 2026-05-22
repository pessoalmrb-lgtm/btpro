'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, getDocFromServer, getDocs, or, writeBatch } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// As variáveis NEXT_PUBLIC_ são seguras para o browser — não contêm segredos.
// Os valores reais ficam em .env.local (não commitado no git).
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const firestoreDatabaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || '(default)';

const getFirebaseApp = () => {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
};

export const auth    = typeof window !== 'undefined' ? getAuth(getFirebaseApp())                              : null as any;
export const db      = typeof window !== 'undefined' ? getFirestore(getFirebaseApp(), firestoreDatabaseId)   : null as any;
export const storage = typeof window !== 'undefined' ? getStorage(getFirebaseApp())                          : null as any;

// ─── Cache offline ───────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open — persistence only works in one tab at a time
      console.warn('Firestore offline persistence: multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // Browser doesn't support persistence
      console.warn('Firestore offline persistence: not supported in this browser');
    }
  });
}

// ─── Firebase Cloud Messaging ────────────────────────────────────────────────
export const getMessagingInstance = () => {
  if (typeof window === 'undefined') return null;
  try {
    return getMessaging(getFirebaseApp());
  } catch {
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<string | null> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const messaging = getMessagingInstance();
    if (!messaging) return null;
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    return token || null;
  } catch (err) {
    console.warn('FCM token error:', err);
    return null;
  }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
  const messaging = getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};

export { getToken, onMessage };

export const getGoogleProvider = () => new GoogleAuthProvider();

// ─── Firebase Storage helpers ────────────────────────────────────────────────

/**
 * Comprime uma imagem (canvas → Blob) e faz upload para o Firebase Storage.
 * Retorna a URL pública de download.
 */
export async function uploadImageToStorage(
  file: File,
  path: string,
  maxDim = 800,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
    reader.onload = (event) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height && width > maxDim) { height *= maxDim / width; width = maxDim; }
        else if (height > maxDim)             { width *= maxDim / height; height = maxDim; }

        canvas.width  = Math.round(width);
        canvas.height = Math.round(height);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
          if (!blob) { reject(new Error('Falha ao converter imagem')); return; }
          try {
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
            const url = await getDownloadURL(storageRef);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }, 'image/jpeg', quality);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Test connection ─────────────────────────────────────────────────────────
export async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

// ─── Error handling ──────────────────────────────────────────────────────────
export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST:   'list',
  GET:    'get',
  WRITE:  'write',
} as const;

export type OperationType = typeof OperationType[keyof typeof OperationType];

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = typeof window !== 'undefined' ? auth?.currentUser : null;
  const errInfo: any = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email:  currentUser?.email,
    },
    operationType,
    path,
  };
  const serialized = JSON.stringify(errInfo);
  console.error('Firestore Error:', serialized);
  throw new Error(serialized);
}

export function cleanData(data: any): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data))   return data.map(item => cleanData(item));
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const key in data) {
      if (data[key] !== undefined) cleaned[key] = cleanData(data[key]);
    }
    return cleaned;
  }
  return data;
}

// ─── Re-exports ──────────────────────────────────────────────────────────────
export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
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
  writeBatch,
  or,
};
export type { User };
