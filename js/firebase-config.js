/* ============================================================
   NyaySetu — firebase-config.js
   Fill this in from your Firebase console:
   Project settings → General → Your apps → SDK setup and config.

   Until FIREBASE_CONFIG.apiKey is filled in, the app runs entirely
   off the bundled JSON files under /data — nothing breaks, Firebase
   is simply skipped. As soon as you add real values here, every
   module (except Case Study — see below) will:
     1. try Firestore first,
     2. cache whatever it gets locally,
     3. fall back to that cache (then to the bundled JSON) whenever
        the device is offline or Firestore is unreachable.

   See FIREBASE_DATA_STRUCTURE.md for the exact collection/document
   shape this app expects.
   ============================================================ */

const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Firestore collection that holds one document per content module.
// Document IDs match the MODULES keys in app.js exactly
// (e.g. "bns", "constitution-parts", "casestudy").
const FIRESTORE_COLLECTION = "nyaysetu_content";

// Case Study is intentionally NOT cached for offline use — per product
// decision, it's an online-only, frequently-updated section. Every other
// module caches for offline reading. See DataSource in js/datasource.js.
const ONLINE_ONLY_MODULES = ["casestudy"];

window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.FIRESTORE_COLLECTION = FIRESTORE_COLLECTION;
window.ONLINE_ONLY_MODULES = ONLINE_ONLY_MODULES;
