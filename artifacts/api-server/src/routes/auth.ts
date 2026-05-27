import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

const sessions = new Map<string, number>();

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = auth.slice(7);
  const userId = sessions.get(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.userId = userId;
  req.token = token;
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  requireAuth(req, res, async () => {
    const user = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
    if (!user[0] || user[0].role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    req.user = user[0];
    next();
  });
}

export { requireAuth, requireAdmin, sessions, hashPin };

router.get("/auth/staff", async (_req, res) => {
  try {
    const users = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role }).from(usersTable).orderBy(usersTable.name);
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: "PIN is required" });
    }

    const hashed = hashPin(String(pin));
    const users = await db.select().from(usersTable).where(eq(usersTable.pin, hashed));

    if (!users[0]) {
      return res.status(401).json({ error: "Invalid PIN" });
    }

    const user = users[0];
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, user.id);

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", requireAuth, (req: any, res) => {
  sessions.delete(req.token);
  return res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req: any, res) => {
  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
    if (!users[0]) {
      return res.status(401).json({ error: "User not found" });
    }
    const user = users[0];
    return res.json({
      id: user.id,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
