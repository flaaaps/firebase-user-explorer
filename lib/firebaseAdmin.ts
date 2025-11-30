import fs from "node:fs";
import path from "node:path";
import {
  getApps,
  getApp,
  initializeApp,
  cert,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth as getAuthModule } from "firebase-admin/auth";

// Utility to load the Firebase service account from env or file.
function loadServiceAccount(): ServiceAccount {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  const fromGooglePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  const tryParseJson = (text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  // 1) FIREBASE_SERVICE_ACCOUNT can be a JSON string or a file path
  if (fromEnv && fromEnv.trim().length > 0) {
    const asJson = tryParseJson(fromEnv);
    if (asJson) {
      return normalizeKey(asJson);
    }
    const absPath = path.isAbsolute(fromEnv)
      ? fromEnv
      : path.join(process.cwd(), fromEnv);
    if (fs.existsSync(absPath)) {
      const content = fs.readFileSync(absPath, "utf8");
      const parsed = tryParseJson(content);
      if (!parsed)
        throw new Error("FIREBASE_SERVICE_ACCOUNT file is not valid JSON");
      return normalizeKey(parsed);
    }
  }

  // 2) GOOGLE_APPLICATION_CREDENTIALS as path
  if (fromGooglePath && fs.existsSync(fromGooglePath)) {
    const content = fs.readFileSync(fromGooglePath, "utf8");
    const parsed = tryParseJson(content);
    if (!parsed)
      throw new Error(
        "GOOGLE_APPLICATION_CREDENTIALS points to a non-JSON file",
      );
    return normalizeKey(parsed);
  }

  // 3) Default local credentials path
  const defaultPath = path.join(
    process.cwd(),
    "credentials",
    "serviceAccountKey.json",
  );
  if (fs.existsSync(defaultPath)) {
    const content = fs.readFileSync(defaultPath, "utf8");
    const parsed = tryParseJson(content);
    if (!parsed)
      throw new Error("credentials/serviceAccountKey.json is not valid JSON");
    return normalizeKey(parsed);
  }

  throw new Error(
    "Firebase Admin credentials not found. Provide FIREBASE_SERVICE_ACCOUNT (JSON or path), set GOOGLE_APPLICATION_CREDENTIALS, or place credentials/serviceAccountKey.json.",
  );
}

function normalizeKey<
  T extends {
    private_key?: string;
    privateKey?: string;
  } & ServiceAccount,
>(obj: T): ServiceAccount {
  const privateKey = (obj.private_key || (obj as any).privateKey || "").replace(
    /\\n/g,
    "\n",
  );
  return {
    projectId: (obj as any).project_id ?? obj.projectId,
    clientEmail: (obj as any).client_email ?? obj.clientEmail,
    privateKey,
  } as ServiceAccount;
}

// Initialize Firebase Admin app once per server instance
function initAdmin(): App {
  if (getApps().length) return getApp();
  const serviceAccount = loadServiceAccount();
  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export function getAdminAuth() {
  const app = initAdmin();
  return getAuthModule(app);
}
