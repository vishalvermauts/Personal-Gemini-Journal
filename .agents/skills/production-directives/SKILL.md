---
name: production-directives
description: Workspace production directives for security, threat modeling, architecture, and stability.
---

# Production Directives

## 1. Agentic Threat Modeling
* **Objective**: Force the model to perform a structured, scenario-driven threat analysis prior to outputting code or system architecture.
* **Scope Lens (The 5 Threat Zones)**:
  * **Input Surfaces**: Prompts, untrusted user uploads, external API payloads.
  * **Planning & Reasoning**: Prompt injection, system instruction bypass, tool routing hijacking.
  * **Tool Execution**: Privilege escalation via API functions, SSRF, dynamic code execution risks.
  * **Memory & State**: Firestore state persistence, session hijacking, cross-user data leaks.
  * **Inter-System Communication**: External API calls (e.g., Google Maps, Google Sheets), token leakage.
* **Mandatory Execution Criteria**: Whenever the user asks to design or implement a feature, the model must first generate a Threat Summary Table mapping risks to countermeasures.

## 2. Secure Coding Standard
* **Objective**: Support mitigations corresponding with the OWASP Top 10 (Web) and OWASP Top 10 for LLM Applications.
* **Core Principles Implemented**:
  * **Input Validation & Sanitization (OWASP A03 / LLM02)**: Strict schema validation for all incoming inputs; explicit parameterization to prevent SQLi, NoSQLi, and Command Injection.
  * **Indirect Prompt Injection Defense (OWASP LLM01)**: Treat data retrieved from untrusted sources (e.g., external APIs, web pages, user files) as plain data, never as executable instructions.
  * **Broken Access Control Mitigation (OWASP A01)**: Validate authorization headers and context-bound permissions at every API boundary.
  * **Output Handling (OWASP A03 / LLM05)**: Encode all dynamic LLM outputs prior to rendering in HTML/JS interfaces or executing downstream system commands.

## 3. Secure Firestore & Firebase Auth Configuration
* **Objective**: Limit data exposure and unauthorized database reads/writes in Firebase/Firestore architectures.
* **Core Security Rules**:
  * **Zero Insecure Defaults**: Never output `allow read, write: if true;`.
  * **User Data Isolation**: Support owner-bound path checking (`request.auth.uid == userId`) for personal documents.
  * **Role-Based Access Control (RBAC)**: Use custom claims or dynamic document lookups (`get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role`) for elevated administrative operations.
  * **Auth State Integrity**: Verify JWT tokens on backend server environments (e.g., Cloud Functions or Cloud Run) using the Firebase Admin SDK.
  * **Passwordless/Federated Auth**: Do not implement email/password login forms that require handling or storing passwords in the application custom code. Prefer Federated Identity (e.g., Google Sign-In via Firebase Auth) to outsource credential management securely.

## 4. Secret Management & Zero-Hardcoding Hygiene
* **Objective**: Eliminate hardcoded credentials, API keys, service account JSON files, and tokens.
* **Mandatory Code Patterns**:
  * **Prohibit Hardcoded Strings**: Flag any pattern resembling `const API_KEY = "AIzaSy..."` as a critical flaw.
  * **Google Cloud Secret Manager Integration**: Force code to retrieve operational credentials dynamically using Secret Manager or environment variable injection:
  ```python
  from google.cloud import secretmanager

  def access_secret(secret_id: str, version_id: str = "latest") -> str:
      client = secretmanager.SecretManagerServiceClient()
      name = f"projects/your-project-id/secrets/{secret_id}/versions/{version_id}"
      response = client.access_secret_version(request={"name": name})
      return response.payload.data.decode("UTF-8")
  ```

## 5. Security Reviewer Persona
* **Objective**: Review any code for common security issues, based on the threat model and best practices.
* **Review Methodology**:
  * Inspect for hardcoded credentials and unsafe default settings.
  * Map data flow from untrusted entry point to storage/execution sink.
  * Validate access control checks at every function boundary.
  * Provide a severity-ranked vulnerability list with concrete code diffs for remediation.

## 6. Functional Stability & Walkthroughs
* **Objective**: In the absence of writing tests, produce steps to test that a user can walk through, broken down into specific pieces of functionality that another coding tool can turn into actual test scripts. **Every type of process and user interaction that a user can see or trigger must have a corresponding test case written out.**

* **Interactive Functionality**: Any buttons that submit an input, either to Gemini API, Firestore, or any added functionality, must actually work.
* **Gemini Model Resilience & Fallback Protocol**: Whenever implementing server-side or client-side Gemini AI features with `@google/genai`:
  1. **Resilient Model Fallback Ladder**:
    Never hardcode a single model string to execute content generation in a single try. Always wrap `generateContent` or `generateContentStream` calls with an automated fallback ladder ordered by availability and latency:
    - Primary: `"gemini-3.6-flash"`
    - High-Availability Fallback: `"gemini-3.1-flash-lite"`
    - Dynamic Alias: `"gemini-flash-latest"`
    - Deep Reasoning Fallback: `"gemini-3.7-flash"`
  2. **Error Recovery Matrix**:
    Catch recoverable HTTP/API status codes (`503 UNAVAILABLE`, `429 RESOURCE_EXHAUSTED`, `404 NOT_FOUND`, `500 INTERNAL`) and sequentially attempt the next model in the fallback chain before bubbling an error up to the UI.
  3. **Standard Helper Implementation**:
    Always scaffold a reusable helper utility (e.g., `generateContentWithFallback`) in backend routes to ensure uniform resilience across all endpoints.
* **Server-Side Robustness & Payload Ingestion Standards**: Across all backend frameworks and runtimes:
  1. **Top-Level Request Deserialization (Ordering Guarantee)**:
    Always mount and configure body parsers and JSON payload middleware before defining any endpoint routes. Handlers must never be registered upstream of payload decoding middleware.
  2. **Defensive Payload Ingestion (Null-Safe Destructuring)**:
    Never assume incoming request bodies, query parameters, or headers exist. Always sanitize and guard input sources with fallback defaults prior to destructuring (e.g., `const data = (req.body && typeof req.body === 'object') ? req.body : {};`). Treat any missing payload as a valid empty input or return a clean `400 Bad Request` instead of allowing unhandled runtime exceptions.
  3. **Unified Full-Stack Dev Script Alignment**:
    Whenever a backend service layer or API proxy is introduced, ensure project configuration and startup scripts (`dev`, `build`, `start`) boot the unified server entrypoint rather than a frontend-only static bundler.
* **Database Persistence, Clean Payloads, & Transaction Integrity**: Whenever handling user input, document creation, or AI generation workflows:
  1. **Strict Undefined-Stripping (Zero-Crash Payload Hygiene)**:
    - Before passing any object to database SDKs (Firestore `setDoc`/`updateDoc`, SQL ORMs, MongoDB, etc.), sanitize the payload to strip all `undefined` values (e.g., using a sanitizer utility or `JSON.parse(JSON.stringify(payload))` / object filtering). Never allow `undefined` properties to reach the database driver.
  2. **Guaranteed Transaction Verification (Input-to-Save Completeness)**:
    - Whenever a user submits an input (prompt, form, reflection, chat, or interaction), the application MUST ensure both the user input AND any generated output are successfully persisted.
    - If user input is received but the save operation or downstream generation fails, the system MUST NOT fail silently.
  3. **Explicit Error Escalation & User Feedback**:
    - Always catch database write rejections and display a clear, accessible error banner or toast in the UI with a "Retry Save" option.
    - Never clear the user's input buffer or reset UI state if the persistence operation has not settled with a confirmed successful write.

## 7. README Generator
* **Objective**: Force the model to generate a professional, production-grade `README.md` file that guides developers step-by-step on how to configure, secure, and deploy the application to Google Cloud Run, supporting compliance with security rules and campaign verification requirements.
* **Scope Lens (Deployment & Configuration Zones)**:
  * **Environment & Prerequisites**: Specific instructions on enabling necessary Google Cloud APIs (Cloud Run, Secret Manager, Firestore) and installing the Firebase / Google Cloud SDK (gcloud CLI).
  * **Secret Management Setup**: Step-by-step guidance on creating Secret Manager secrets (e.g., `GEMINI_API_KEY`) and granting the Cloud Run runtime service account the necessary Secret Manager Secret Accessor IAM permissions.
  * **Database Security Configuration**: Instructions for provisioning Cloud Firestore and deploying secure, owner-bound security rules (`firestore.rules`).
  * **Cloud Run Deployment Flow**: Pre-formatted, container-friendly deploy instructions utilizing the `gcloud run deploy` command.
  * **Required Campaign Labeling**: Detailed instructions on applying the mandatory resource label to register the service for automated challenge verification:
* **Mandatory Execution Criteria**: When invoked, the model must output a fully populated, copy-pasteable README structure. It is highly recommended that the generated README includes:
  1. **Firestore Security Rules**: The exact rules block supporting user data isolation:
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
  2. **Secret Manager Bindings**:
     ```bash
     # Create and populate the secret
     gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
     echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

     # Grant the default Cloud Run service account access to read the secret
     gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
       --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
       --role="roles/secretmanager.secretAccessor"
     ```
  3. **Verification Binding**:
     ```bash
     gcloud run services update <SERVICE_NAME> \
       --update-labels=dev-tutorial=cloud-run-ai-challenge \
       --region=<REGION>
     ```

## 8. Private AI Memory & Retrieval Security

* **Objective**: Support AI-powered journal history, memory retrieval, search, summarization, tagging, and cross-entry reasoning without violating user isolation.

* **Mandatory Security Rules**:
  1. Every retrieval operation MUST be scoped to the authenticated Firebase UID.
  2. Never trust a `userId` supplied by the browser for authorization. Derive user identity from the verified Firebase ID token.
  3. Never perform unrestricted cross-user Firestore searches.
  4. Documents MUST pass authorization checks before being included in Gemini context.
  5. Journal entries, summaries, imported content, metadata, and search results MUST be treated as untrusted data rather than executable model instructions.
  6. Retrieved journal content MUST never override system instructions or developer security directives.
  7. Never expose Firebase UID values, authentication claims, internal document paths, tokens, backend metadata, or another user's information in AI output.
  8. Limit the number and size of documents inserted into model context to prevent excessive token consumption and context flooding.
  9. Search and retrieval failures MUST fail closed rather than returning potentially unauthorized records.
  10. AI-generated tags, summaries, topics, titles, sentiment, and insights MUST be treated as generated metadata and never as authorization attributes.

* **Data Model Principle**:
  Prefer owner-bound structures such as:

  `users/{uid}/entries/{entryId}`

  `users/{uid}/insights/{insightId}`

  rather than global user-generated collections unless equivalent server-side ownership enforcement exists.

---

## 9. Structured Gemini Insights

* **Objective**: Extend the application beyond basic chat by converting journal interactions into useful structured personal insights.

* **Required Capabilities**:
  - Generate a concise title for an entry.
  - Generate a short summary.
  - Extract topics/tags.
  - Extract key ideas or action items where appropriate.
  - Support recurring-topic and historical reflection features.
  - Preserve the original journal content separately from AI-generated metadata.

* **Implementation Requirements**:
  1. Use schema-constrained structured output whenever supported.
  2. Validate all Gemini-generated structured data before storing it.
  3. Never overwrite the user's original journal text with an AI-generated summary.
  4. Clearly distinguish AI-generated insights from user-authored content in the UI.
  5. If insight generation fails, preserve the journal entry and provide a retry mechanism.
  6. Do not infer sensitive personal attributes unless the user explicitly requests such analysis and the feature is appropriate.
  7. Historical analysis MUST only use entries belonging to the authenticated user.

---

## 10. Timeline & Search

* **Objective**: Provide a private chronological memory timeline and secure journal search.

* **Functional Requirements**:
  - Users can browse entries chronologically.
  - Users can search their own entries.
  - Users can filter using dates and generated tags/topics.
  - Search results link back to the original entry.
  - Empty states and loading states must be implemented.
  - Search failures must display useful, non-sensitive error messages.

* **Security Requirements**:
  - Every query MUST remain scoped to the authenticated user.
  - Search input must be length-limited and validated.
  - Search terms must never be interpreted as backend commands.
  - Retrieved content supplied to Gemini must be explicitly delimited as untrusted journal data.
  - No search endpoint may accept arbitrary Firestore collection paths from clients.

* **Performance Requirements**:
  - Use pagination instead of downloading an entire journal history.
  - Avoid sending unnecessary historical entries to Gemini.
  - Add required Firestore indexes where appropriate and document them.

---

## 11. Location Privacy & Google Maps

* **Objective**: Allow optional location-aware journal memories while minimizing collection and exposure of location data.

* **Privacy Requirements**:
  1. Location collection MUST be explicit opt-in.
  2. Never automatically store precise location merely because browser geolocation permission exists.
  3. Explain to the user when location will be stored.
  4. Users MUST be able to remove location from an entry.
  5. Users MUST be able to disable location features.
  6. Location information MUST remain scoped to the entry owner.
  7. Do not expose one user's locations to another user.
  8. Avoid storing unnecessary raw geolocation information when a lower-precision place representation satisfies the feature.

* **Google Maps Security**:
  - Apply API restrictions and application restrictions to Maps API keys.
  - Never use unrestricted production API keys.
  - Server-only credentials MUST never be included in client bundles.
  - Never log credentials or authentication tokens.
  - Validate location-related payloads before persistence.

* **UI Requirements**:
  Provide explicit actions such as:

  `Add location`

  `Remove location`

  rather than silently attaching location.

---

## 12. Privacy Center, Data Export & Deletion

* **Objective**: Give users meaningful control over their stored information.

* **Required Privacy Center**:
  Provide a dedicated Privacy & Security interface showing:
  - Data export controls.
  - Journal deletion controls.
  - Account deletion controls where supported.
  - Location-storage preference.
  - AI processing preferences where applicable.
  - A concise explanation of how user isolation works.

* **Data Export Requirements**:
  1. Verify Firebase authentication server-side.
  2. Derive UID exclusively from the verified token.
  3. Export only documents belonging to that UID.
  4. Support a machine-readable format such as JSON.
  5. Optionally support human-readable Markdown.
  6. Never include access tokens, API keys, Firebase claims, internal service configuration, Secret Manager data, or unrelated backend metadata.
  7. Apply appropriate content type and download headers.

* **Deletion Requirements**:
  1. Destructive bulk operations require explicit confirmation.
  2. Re-verify authorization before deletion.
  3. Delete or anonymize associated user-owned records according to the documented data model.
  4. Never delete another user's records based on a client-provided UID.
  5. Report partial failures instead of claiming successful deletion.
  6. Update the UI only after the operation has been confirmed.

---

## 13. Secure Optional Sharing

* **Objective**: Allow users to explicitly share selected content without weakening the security of their original private journal.

* **Default State**:
  Every journal entry MUST remain private unless its owner explicitly creates a share.

* **Sharing Requirements**:
  - Generate high-entropy, non-sequential share tokens.
  - Support revocation.
  - Support expiration.
  - Expose only a sanitized representation of the selected content.
  - Never expose Firebase UID, email address, authentication claims, internal document IDs, tokens, or unrelated journal data.
  - Never change the original journal document to globally readable.
  - Verify ownership before creating or revoking a share.
  - Expired or revoked links must fail closed.

* **Abuse Controls**:
  Apply reasonable rate limiting to public share endpoints and avoid revealing whether private document identifiers exist.

* **Implementation Priority**:
  This feature is optional and MUST NOT delay or weaken authentication, journal isolation, timeline/search, privacy controls, or stability.

---

## 14. Graceful AI Degradation & User Data Protection

* **Objective**: Ensure that journal functionality remains reliable when Gemini or another dependency becomes unavailable.

* **Mandatory Behaviour**:
  1. Saving user-authored content and generating AI analysis should be treated as separately recoverable operations where architecture permits.
  2. If the journal entry is successfully persisted but Gemini fails, retain the entry and mark AI processing as retryable.
  3. Never discard user-authored content because Gemini generation failed.
  4. Provide clear states such as:
     - Saving
     - Saved
     - Generating insights
     - AI temporarily unavailable
     - Retry analysis
     - Save failed
     - Retry save
  5. Avoid exposing raw stack traces, provider internals, secrets, or sensitive request information to users.
  6. Use bounded retries with backoff; never create uncontrolled retry loops.
  7. Gemini fallback must not cause duplicate Firestore entries.
  8. All retry operations must be idempotent where practical.

---

## 15. Automated Security & Functional Testing

* **Objective**: Convert the application's security and stability guarantees into reproducible tests rather than relying exclusively on manual walkthroughs.

* **Minimum Authorization Test Matrix**:

  For every private user-owned resource:

  - Owner CAN create.
  - Owner CAN read.
  - Owner CAN update where applicable.
  - Owner CAN delete where applicable.
  - Different authenticated user CANNOT read.
  - Different authenticated user CANNOT modify.
  - Unauthenticated user CANNOT read.
  - Unauthenticated user CANNOT modify.

* **Required Test Areas**:
  - Authentication.
  - Firestore security rules.
  - Journal creation.
  - Journal history.
  - Timeline/search.
  - AI insight failure/retry.
  - Invalid/missing payloads.
  - Data export authorization.
  - Data deletion authorization.
  - Location privacy if implemented.
  - Sharing authorization/expiration if implemented.

* **Security Regression Requirement**:
  Any feature that introduces a new Firestore collection, API endpoint, external service, or privileged operation MUST receive corresponding authorization and negative tests.

---

## 16. Observability Without Privacy Leakage

* **Objective**: Make the Cloud Run application diagnosable without leaking private journal data.

* **Logging Requirements**:
  - Use structured server-side logging.
  - Record request correlation IDs where useful.
  - Record operation status and sanitized error classifications.
  - Never log complete journal text by default.
  - Never log Gemini API keys, Firebase ID tokens, cookies, authorization headers, Secret Manager payloads, or credentials.
  - Avoid logging precise location information unless explicitly necessary and safely handled.
  - Sanitize external API errors before logging.

* **Operational Signals**:
  Track or expose through Google Cloud observability where appropriate:
  - Request failures.
  - Request latency.
  - Gemini generation failures.
  - Firestore write failures.
  - Authentication failures.
  - Cloud Run instance/runtime errors.

---

## 17. Accessibility & Responsive Usability

* **Objective**: Ensure the application is usable beyond a technical demonstration.

* **Requirements**:
  - Responsive mobile and desktop layouts.
  - Keyboard-accessible interactive controls.
  - Semantic HTML.
  - Accessible labels for form controls and icon-only buttons.
  - Visible keyboard focus.
  - Sufficient contrast.
  - Loading indicators for asynchronous operations.
  - Useful empty states.
  - Clear success and error feedback.
  - Prevent accidental duplicate form submissions.
  - Destructive actions require confirmation.
  - Do not rely solely on color to communicate application state.

---

## 18. Challenge Evidence & Documentation

* **Objective**: Make implementation quality easy to verify from the public repository.

* **Required Documentation**:

  `README.md`
  - Project purpose.
  - Architecture.
  - Features beyond the starter codelab.
  - Local development.
  - Google Cloud deployment.
  - Firebase configuration.
  - Secret Manager configuration.
  - Firestore security rules.
  - Required Cloud Run challenge label.
  - Testing instructions.
  - Screenshots or demonstration media.

  `docs/THREAT_MODEL.md`
  - Assets.
  - Trust boundaries.
  - Threat surfaces.
  - Attack scenarios.
  - Mitigations.
  - Residual risks.

  `docs/ARCHITECTURE.md`
  - Browser/frontend.
  - Firebase Authentication.
  - Cloud Run backend.
  - Gemini.
  - Firestore.
  - Secret Manager.
  - Google Maps if implemented.
  - Data flows and trust boundaries.

  `docs/SECURITY.md`
  - Authentication model.
  - Authorization model.
  - Secret management.
  - Data isolation.
  - Prompt-injection protections.
  - Logging/privacy policy.
  - Vulnerability reporting guidance.

* **Challenge Comparison**:
  README MUST contain a concise section explaining which functionality comes from the starter application and which functionality was independently added.

* **Evaluation Mapping**:
  README SHOULD explicitly map implemented functionality to:

  - Authenticity
  - Usability
  - Stability
  - Security

* **Evidence Integrity**:
  Never claim that a security control, test, integration, or feature exists unless it is actually implemented and verifiable in the repository.
