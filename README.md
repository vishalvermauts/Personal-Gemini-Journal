# Reflection Journal with Gemini AI & Cloud Firestore

A secure, full-stack, user-authenticated journaling and reflection web application powered by **Gemini 3.6 Flash** and **Google Cloud Firestore**.

---

## Architecture & Security Highlights

1. **User Identity & Federated Auth**:
   - Google Sign-In managed securely via Firebase Authentication (zero password handling or storage in custom code).
2. **Strict User Data Isolation**:
   - Cloud Firestore security rules isolate every document to the authenticating user (`request.auth.uid == userId`). Cross-user read or write attempts are mathematically blocked by Firestore security rules.
3. **Resilient Server-Side Gemini API Proxy**:
   - The client never touches or sees the Gemini API key. Requests route through `/api/gemini/reflect` with an automated 4-tier model fallback ladder (`gemini-3.6-flash` -> `gemini-3.1-flash-lite` -> `gemini-flash-latest` -> `gemini-3.7-flash`).
4. **Transaction Verification & Zero-Crash Hygiene**:
   - Guaranteed input-to-save completeness: both the user's reflection and Gemini's response are persisted to Firestore with recursive undefined-stripping prior to document commit.

---

## 1. Cloud Firestore Security Rules

The application uses path-based rules to enforce single-tenant isolation for each user's entries:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 2. Google Cloud Secret Manager Configuration

Keep the Gemini API key protected from container images and source control by binding it to Google Cloud Secret Manager:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Cloud Run Deployment Flow

Deploy the application as a containerized service on Cloud Run with the Secret Manager environment variable binding:

```bash
# Build and deploy service to Cloud Run
gcloud run deploy reflect-journal-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

---

## 4. Required Campaign Verification Binding

Apply the mandatory challenge label to register the service for automated campaign verification:

```bash
gcloud run services update <SERVICE_NAME> \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=<REGION>
```

---

## 5. Local Development

```bash
# Install dependencies
npm install

# Start unified dev server with tsx and Vite middleware on port 3000
npm run dev

# Run production compilation check
npm run build
```
