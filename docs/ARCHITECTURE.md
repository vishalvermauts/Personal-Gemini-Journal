# Gemini LifeLog — System Architecture

## 1. High-Level Architecture Overview

**Gemini LifeLog** is a privacy-first, cloud-native personal AI memory and reflection system engineered for deployment on **Google Cloud Run**, backed by **Cloud Firestore** and powered by the **Google Gemini API** (`@google/genai`).

```mermaid
graph TD
    User["User Browser (Desktop / Mobile)"]
    FirebaseAuth["Firebase Authentication (Google Identity)"]
    ViteReact["React 19 SPA (Vite + Tailwind CSS v4)"]
    CloudRun["Express API Proxy (Google Cloud Run)"]
    FirebaseAdmin["Firebase Admin SDK (ADC / Token Verification)"]
    SecretManager["Google Cloud Secret Manager (GEMINI_API_KEY)"]
    Gemini["Gemini API (3.6-Flash / 3.1-Flash-Lite / Fallback Ladder)"]
    Firestore["Cloud Firestore (Per-User Vault: users/{uid}/interactions)"]

    User -->|OAuth Sign-In| FirebaseAuth
    FirebaseAuth -->|ID Token (JWT)| User
    User -->|Interactive UI| ViteReact
    ViteReact -->|Direct Client-Side Vault Access| Firestore
    ViteReact -->|Bearer ID Token + Prompts| CloudRun
    CloudRun -->|Verify Token| FirebaseAdmin
    CloudRun -->|Fetch Secret at Startup| SecretManager
    CloudRun -->|Delimited Prompts| Gemini
```

---

## 2. Core Architectural Components

### 2.1. Client Frontend (React 19 + TypeScript + Vite)
- **State & Routing**: Single-Page Architecture with responsive tab navigation (`Journal`, `Timeline`, `Insights`, `Memories`, `Privacy`).
- **Authentication Context**: Listens to Firebase Auth state via `onAuthStateChanged`. Automatically retrieves and refreshes short-lived Firebase ID tokens using `currentUser.getIdToken()` without persisting raw tokens in `localStorage`.
- **Database Client**: Direct real-time Firestore listeners (`onSnapshot`), exports, and deletes scoped strictly to `users/${currentUser.uid}/interactions`.
- **Google Maps Platform Integration**: Powered by `@vis.gl/react-google-maps` (Maps JavaScript API) using defensive coordinate validation, interactive Advanced Markers, InfoWindows, dynamic bounds fitting, and accessible sidebar list fallback.

### 2.2. Backend API Service (Express on Google Cloud Run)
- **Cloud Run Public Access Model**: The service is intentionally deployed with `--allow-unauthenticated` so the public SPA and static frontend bundle load in any browser without Google Cloud IAM accounts.
- **Application Security**: Sensitive routes (`/api/gemini/*`) are strictly protected via the `requireAuth` middleware requiring a valid Google Firebase ID token.
- **Authentication Middleware (`requireAuth`)**:
  - Validates `Authorization: Bearer <token>` header on all protected `/api/*` routes.
  - Verifies JWT using `firebase-admin/auth`.
  - Derives user identity strictly from `decodedToken.uid`. Never trusts client-supplied user IDs.
- **Gemini Fallback Ladder (`geminiService.ts`)**:
  1. `gemini-3.6-flash` (Primary)
  2. `gemini-3.1-flash-lite` (High-Availability Fallback)
  3. `gemini-flash-latest` (Dynamic Alias)
  4. `gemini-3.7-flash` (Deep Reasoning Fallback)
  - Automatically recovers from `503 UNAVAILABLE`, `429 RESOURCE_EXHAUSTED`, and transient network spikes.
- **Defensive Request Validation**: Rejects invalid payloads, prompts > 12,000 characters, and malformed history arrays with HTTP 400.
- **Prompt Injection Defense**: Explicit delimiters (`<untrusted_journal_entry>`, `<untrusted_journal_history_turn>`) ensure user inputs cannot override developer system instructions.

### 2.3. Data Tier (Cloud Firestore)
- **Ownership Model**: Path-based per-user data isolation: `/users/{userId}/interactions/{interactionId}`.
- **Security Rules**: Default-deny on all unlisted paths (`allow read, write: if false;`). Owner-bound access where `request.auth.uid == userId`.
- **Zero-Crash Payload Hygiene**: Recursive undefined-stripping utility ensures database drivers never receive invalid properties.

### 2.4. Secret & Credential Management
- **Runtime Identity**: Cloud Run Service Account utilizes Application Default Credentials (ADC) for Firebase Admin.
- **Required IAM Permissions**: `roles/secretmanager.secretAccessor` on the `GEMINI_API_KEY` secret.
- **API Secrets**: `GEMINI_API_KEY` is injected as a Cloud Run environment variable sourced from Secret Manager (`--set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest`). Zero hardcoded secrets in source code or client bundles.

---

## 3. Data Flow & Transaction Lifecycle

### Resilient Save-Before-Analysis Pipeline:
1. **User Submission**: User writes reflection in `ReflectionWorkspace`.
2. **Phase 1 (Instant Vault Save)**:
   - Client writes draft to Firestore (`users/{uid}/interactions/{id}`) with `aiStatus: 'pending'`.
   - Editor text is safely cleared; input is permanently persisted.
3. **Phase 2 (Parallel AI Synthesis)**:
   - Client calls `POST /api/gemini/reflect` and `POST /api/gemini/analyze` with `Authorization: Bearer <ID_TOKEN>`.
   - Backend validates token and schema, formats untrusted delimiters, and invokes Gemini fallback ladder.
   - Structured JSON analysis extracts: `title`, `summary`, `topics`, `keyIdeas`, `actionItems`, `mood`.
4. **Phase 3 (Vault Sync)**:
   - Document updated in Firestore with `aiStatus: 'completed'`, companion text, and structured insights.
   - If AI fails: Firestore document remains saved with `aiStatus: 'failed'`, and a "Retry AI Analysis" button allows the user to re-trigger analysis idempotently.

---

## 4. Trust Boundaries & Security Zones

| Zone | Boundary | Execution Context | Protection Mechanism |
| :--- | :--- | :--- | :--- |
| **Browser -> Cloud Run** | Public Web -> Backend | Server-Side | Firebase ID Token verification via Firebase Admin SDK (`requireAuth`). |
| **Browser -> Firestore** | Public Web -> Database | Client-Side | Cloud Firestore Security Rules (`request.auth.uid == userId`). |
| **Cloud Run -> Gemini** | Backend -> Google Cloud AI | Server-Side | Server-side `GEMINI_API_KEY` from Secret Manager, untrusted prompt delimiters. |
| **Export & Deletion** | Browser -> Firestore | Client-Side | Authenticated Firebase Client SDK restricted by Firestore Security Rules. |
| **User A -> User B** | Tenant -> Tenant | Cross-User | Mathematical isolation; cross-user queries/mutations denied by Firestore. |
