# User Explorer — Firebase Auth search (Next.js)

This is a minimal Next.js app to search Firebase Authentication users by email substring using the Firebase Admin SDK. It has a small UI with a debounced search box and a backend API that scans and caches users for responsive results.

## Quick start

1. Install dependencies
   npm install

2. Provide Firebase Admin credentials (pick ONE of the following):
   - **Option A: Place your service account JSON at credentials/serviceAccountKey.json**

     Go to your Firebase Console > Project Settings > Service Accounts > Generate New Private Key. Download the JSON
     file and save it as credentials/serviceAccountKey.json.
   - Option B: Set GOOGLE_APPLICATION_CREDENTIALS to an absolute path of your JSON
   - Option C: Set FIREBASE_SERVICE_ACCOUNT to either the JSON contents (stringified) or a path to the JSON file

   The repo contains a placeholder at credentials/_serviceAccountKey.json that you can replace and rename.

3. Run the app

   npm run dev

   Then open http://localhost:3000

## API

- GET /api/users?q=<query>&limit=<n>
  - q: email substring (case-insensitive). Must be at least 2 characters.
  - limit: optional, default 50, max 200.
  - Response has keys: users, totalScanned, tookMs

## Configuration

### Optional environment variables:

- USERS_CACHE_TTL_MS: in-memory cache TTL for the full user list. Default 300000 (5 minutes).
- MAX_SCAN_USERS: safety upper bound when scanning users. Default 20000.
- FIREBASE_SERVICE_ACCOUNT: JSON string or file path for the service account.
- GOOGLE_APPLICATION_CREDENTIALS: file path to the service account JSON.

### Performance notes

- The first search may scan and cache users (paged at 1000). Subsequent searches use in-memory cache until TTL expires, keeping results fast.
- For very large user bases, consider an external search index if you need sub-ms queries.

### Scripts

- npm run dev — start Next.js in development
- npm run build — build the production bundle
- npm run start — start production server
