import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  writeBatch,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { OperationType, type FirestoreErrorInfo, type Interaction, type StructuredInsights } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Specify firestoreDatabaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom parameters to guarantee account selection prompt
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Validates connection to Firestore
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client appears offline. Verify network connection and configuration.');
    }
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
      response: interaction.response || '',
      turns: interaction.turns || [],
      insights: interaction.insights || null,
      location: interaction.location || null,
      aiStatus: interaction.aiStatus || 'completed',
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
 * Partially updates an interaction document (e.g. updating AI insights or location)
 */
export async function updateInteraction(
  userId: string,
  interactionId: string,
  updates: Partial<Interaction>
): Promise<void> {
  const docPath = `users/${userId}/interactions/${interactionId}`;
  try {
    const cleanUpdates = sanitizeFirestorePayload({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    const docRef = doc(db, 'users', userId, 'interactions', interactionId);
    await updateDoc(docRef, cleanUpdates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
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
 * Permanently deletes ALL interactions belonging strictly to the specified user.
 * Atomic batch deletion prevents orphan records.
 */
export async function deleteAllUserInteractions(userId: string): Promise<number> {
  const collectionPath = `users/${userId}/interactions`;
  try {
    const collRef = collection(db, 'users', userId, 'interactions');
    const snapshot = await getDocs(collRef);
    if (snapshot.empty) return 0;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    return snapshot.size;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, collectionPath);
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

/**
 * Triggers a secure browser file download for user data export
 */
export function downloadFile(content: string, fileName: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formats user's journal entries into clean, machine-readable JSON
 * Strips all tokens, internal IDs, and service metadata
 */
export function exportUserDataAsJSON(interactions: Interaction[]): string {
  const exportPayload = {
    exportDate: new Date().toISOString(),
    appName: 'Gemini LifeLog',
    version: '1.0.0',
    totalEntries: interactions.length,
    entries: interactions.map((i) => ({
      id: i.id,
      title: i.title,
      mode: i.mode,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      prompt: i.prompt,
      response: i.response,
      turns: i.turns || [],
      insights: i.insights || null,
      location: i.location || null,
    })),
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Formats user's journal entries into human-readable Markdown
 */
export function exportUserDataAsMarkdown(interactions: Interaction[]): string {
  let md = `# Gemini LifeLog Journal Export\n\n`;
  md += `*Exported on: ${new Date().toLocaleString()}*\n`;
  md += `*Total Entries: ${interactions.length}*\n\n---\n\n`;

  interactions.forEach((item, idx) => {
    md += `## ${idx + 1}. ${item.title || 'Untitled Reflection'}\n`;
    md += `- **Date**: ${new Date(item.createdAt).toLocaleString()}\n`;
    md += `- **Mode**: ${item.mode}\n`;
    if (item.location?.name) {
      md += `- **Location**: ${item.location.name}\n`;
    }
    if (item.insights?.mood) {
      md += `- **Mood**: ${item.insights.mood}\n`;
    }
    if (item.insights?.topics?.length) {
      md += `- **Topics**: ${item.insights.topics.join(', ')}\n`;
    }
    md += `\n### Journal Entry\n\n${item.prompt}\n\n`;
    if (item.response) {
      md += `### Gemini AI Companion Reflection\n\n${item.response}\n\n`;
    }
    if (item.insights?.summary) {
      md += `> **Summary**: ${item.insights.summary}\n\n`;
    }
    if (item.insights?.keyIdeas?.length) {
      md += `**Key Ideas**:\n`;
      item.insights.keyIdeas.forEach((k) => (md += `- ${k}\n`));
      md += `\n`;
    }
    if (item.insights?.actionItems?.length) {
      md += `**Action Items**:\n`;
      item.insights.actionItems.forEach((a) => (md += `- [ ] ${a}\n`));
      md += `\n`;
    }
    if (item.turns?.length) {
      md += `### Extended Dialogue (${item.turns.length} turns)\n\n`;
      item.turns.forEach((t, tIdx) => {
        md += `**Turn ${tIdx + 2} (You)**: ${t.user}\n\n`;
        md += `**Turn ${tIdx + 2} (Gemini)**: ${t.model}\n\n`;
      });
    }
    md += `---\n\n`;
  });

  return md;
}

export { onAuthStateChanged, signInWithPopup, signOut, type User };
