import express, { Request, Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  getUserProfile,
  upsertUserProfile,
  type UserRole,
} from "../services/firestore.service.js";

const router = express.Router();

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const uid = authReq.user?.uid;

  if (!uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const profile = await getUserProfile(uid);
    return res.json({
      uid,
      email: authReq.user?.email ?? null,
      profile,
    });
  } catch (err) {
    console.error("GET /auth/me failed", err);
    return res.status(500).json({ message: "Failed to load profile" });
  }
});

router.post(
  "/upsert-profile",
  requireAuth,
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const uid = authReq.user?.uid;
    if (!uid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { role, displayName, photoURL } = (req.body || {}) as {
      role?: UserRole;
      displayName?: string;
      photoURL?: string;
    };

    if (role !== "student" && role !== "creator") {
      return res
        .status(400)
        .json({ message: "Invalid role. Use student | creator" });
    }

    try {
      const profile = await upsertUserProfile({
        uid,
        email: authReq.user?.email,
        displayName,
        photoURL,
        role,
      });

      return res.json({ profile });
    } catch (err) {
      console.error("POST /auth/upsert-profile failed", err);
      return res.status(500).json({ message: "Failed to upsert profile" });
    }
  }
);

export default router;
