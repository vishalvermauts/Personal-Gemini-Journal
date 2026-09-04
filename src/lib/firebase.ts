import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  deleteDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { OperationType, type FirestoreErrorInfo, type Interaction } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom parameters to guarantee account selection prompt
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Validates connection to Firestore according to skill guidelines
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client appears offline. Verify network connection and configuration.');
    }
    // Expected to fail with permission-denied or non-existent document in strict default-deny setups
    return false;
  }
}

/**
 * Mandatory Firestore error handler conforming to FirestoreErrorInfo JSON spec
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Recursively strips all undefined values so Firestore writes never fail.
 */
export function sanitizeFirestorePayload<T>(payload: T): T {
  if (payload === null || payload === undefined) {
    return payload;
  }
  return JSON.parse(JSON.stringify(payload, (_key, value) => {
    return value === undefined ? null : value;
  }));
}

/**
 * Saves or updates an interaction document in user-isolated Firestore path:
 * /users/{userId}/interactions/{interactionId}
 */
export async function saveInteraction(userId: string, interaction: Interaction): Promise<void> {
  const docPath = `users/${userId}/interactions/${interaction.id}`;
  try {
    const cleanData = sanitizeFirestorePayload({
      id: interaction.id,
      userId: interaction.userId,
      title: interaction.title || 'Untitled Reflection',
      mode: interaction.mode || 'reflection',
      prompt: interaction.prompt,
      response: interaction.response,
      turns: interaction.turns || [],
      createdAt: interaction.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const docRef = doc(db, 'users', userId, 'interactions', interaction.id);
    await setDoc(docRef, cleanData);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

/**
 * Deletes an interaction document
 */
export async function deleteInteraction(userId: string, interactionId: string): Promise<void> {
  const docPath = `users/${userId}/interactions/${interactionId}`;
  try {
    const docRef = doc(db, 'users', userId, 'interactions', interactionId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}

/**
 * Subscribes to user-isolated interactions in real-time
 */
export function subscribeToUserInteractions(
  userId: string,
  onData: (interactions: Interaction[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const collectionPath = `users/${userId}/interactions`;
  const collRef = collection(db, 'users', userId, 'interactions');

  return onSnapshot(
    collRef,
    (snapshot) => {
      const items: Interaction[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Interaction;
        items.push({
          ...data,
          id: d.id,
        });
      });
      // Sort in-memory to prevent complex composite index requirements
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, collectionPath);
      } catch (formattedError: any) {
        onError(formattedError);
      }
    }
  );
}

export { onAuthStateChanged, signInWithPopup, signOut, type User };
