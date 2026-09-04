# Gemini LifeLog — Security Policy & Guidelines

This document outlines the security architecture, data governance principles, and vulnerability reporting procedures for **Gemini LifeLog**.

---

## 1. Authentication & Identity Architecture

- **Federated Authentication**: User sign-in is managed exclusively via Google Identity through Firebase Authentication (`signInWithPopup`).
- **Zero-Password Storage**: No passwords, password hashes, or password reset tokens are ever received, stored, or processed by custom application code.
- **Short-Lived Token Protocol**: The client invokes Firebase Auth SDK's `currentUser.getIdToken()` to retrieve cryptographically signed JWTs dynamically. Raw tokens are never persisted in browser `localStorage`, cookies, or session storage.
- **Server-Side Token Verification**: The Express API enforces `Authorization: Bearer <token>` on all sensitive endpoints (`/api/gemini/*`). Tokens are validated against Google's public keys via `firebase-admin/auth`.

---

## 2. Authorization & Database Per-User Data Isolation

- **Path-Bound Isolation**: All user-generated content resides under `/users/{userId}/interactions/{interactionId}`.
- **Default-Deny Policy**: Cloud Firestore security rules reject all requests to undeclared paths with `allow read, write: if false;`.
- **Per-User Isolation Rules**:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if false;
      }
      match /users/{userId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        match /interactions/{interactionId} {
          allow read, delete: if request.auth != null && request.auth.uid == userId;
          allow create, update: if request.auth != null && request.auth.uid == userId
            && request.resource.data.userId == userId;
        }
      }
    }
  }
  ```

---

## 3. Secret Management & Zero-Hardcoding Hygiene

- **Secret Manager Binding**: The operational secret `GEMINI_API_KEY` is bound to Google Cloud Secret Manager and injected securely into Cloud Run at runtime (`--set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest`).
- **No Service Account JSON Files**: The server utilizes Application Default Credentials (ADC) provided by the Cloud Run metadata server, eliminating credential theft from local repositories.
- **Client Bundle Isolation**: Build checks ensure that no backend environment variables or API keys are exposed to the client-side bundle.

---

## 4. Prompt Safety & Delimited Untrusted Context

- **Data/Instruction Separation**: User prompts are enclosed within `<untrusted_journal_entry>` tags.
- **System Directive Anchoring**: System instructions command Gemini to treat user entries strictly as passive data, rendering prompt injection attempts inert.
- **Structured Schema Validation**: AI insights are validated against strict JSON schemas and scrubbed before storage.

---

## 5. Privacy Controls: Data Export & Irreversible Purge

- **Client-Side Export**: Users can export their entire journal directly from Firestore in clean JSON and Markdown formats.
- **Client-Side Irreversible Deletion**: Users can purge their entire journal vault with a typed confirmation challenge (`DELETE`). Deletion operates via atomic Firestore batches scoped strictly to the authenticated user's records under Firestore security rules.
- **No Secret/Token Leakage**: Generated exports contain only journal content, timestamps, locations, and structured insights—zero Firebase tokens or backend secrets.

---

## 6. Location Privacy & Google Maps Platform Security

- **100% Opt-In**: Geolocation is never gathered in the background or requested on page load.
- **Fuzzy Coordinates**: Coordinates captured via the browser can be rounded to coarse city/region levels.
- **Instant Removal**: Users can detach or remove location metadata from any entry at any time with a single click.
- **Google Maps Platform Integration**: Rendered using `@vis.gl/react-google-maps` (Google Maps JavaScript API) using defensive coordinate validation, interactive Advanced Markers, InfoWindows, and dynamic bounds fitting.
- **Browser API Key Security**: The Maps API key (`VITE_GOOGLE_MAPS_API_KEY`) is a public browser-delivered credential. Its security is enforced through Google Cloud Console **HTTP Referrer Restrictions** (`https://<CLOUD_RUN_DOMAIN>/*` and `http://localhost:5173/*`) and **API Scope Restrictions** (restricted strictly to Maps JavaScript API). Unrestricted keys are strictly prohibited in production.

---

## 7. Vulnerability Reporting

If you identify a security vulnerability or architectural flaw:
1. Please report it privately via email or GitHub security advisory.
2. Provide steps to reproduce the issue.
3. Do not attempt to exploit the issue against production environments.
