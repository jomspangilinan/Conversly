import type { NextFunction, Request, Response } from "express";
import admin from "firebase-admin";
import { config } from "../config/env.js";

export type AuthenticatedRequest = Request & {
  user?: {
    uid: string;
    email?: string;
  };
};

function ensureFirebaseAdminInitialized() {
  if (admin.apps.length) return;

  // Reuse the same service-account based init pattern as Firestore.
  admin.initializeApp({
    credential: admin.credential.cert(config.gcp.serviceAccountPath),
    projectId: config.gcp.projectId,
  });
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const header = String(req.headers.authorization || "");
    const match = header.match(/^Bearer\s+(?<token>.+)$/i);
    const token = match?.groups?.token;

    if (!token) {
      return res
        .status(401)
        .json({ message: "Missing Authorization Bearer token" });
    }

    ensureFirebaseAdminInitialized();
    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
    };

    return next();
  } catch (err) {
    console.error("Auth verify failed", err);
    return res.status(401).json({ message: "Invalid or expired auth token" });
  }
}
