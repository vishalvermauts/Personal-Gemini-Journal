import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

/**
 * Safely initializes Firebase Admin SDK using Application Default Credentials (ADC)
 * or Cloud Run runtime identity without hardcoded service account keys or files.
 */
let adminApp: App | null = null;
let adminAuthInstance: Auth | null = null;

export function getFirebaseAdminApp(): App {
  if (!adminApp) {
    if (getApps().length === 0) {
      adminApp = initializeApp();
    } else {
      adminApp = getApp();
    }
  }
  return adminApp;
}

export function getAdminAuth(): Auth {
  if (!adminAuthInstance) {
    adminAuthInstance = getAuth(getFirebaseAdminApp());
  }
  return adminAuthInstance;
}
