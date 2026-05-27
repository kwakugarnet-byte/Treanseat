import { Router } from "express";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

async function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = auth.slice(7);
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token));
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.userId = session.userId;
  req.token = token;
  next();
}

async function requireAdmin(req: any, res: any, next: any) {
  await requireAuth(req, res, async () => {
    const user = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
    if (!user[0] || user[0].role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    req.user = user[0];
    next();
  });
}

export { requireAuth, requireAdmin, hashPin };

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
    await db.insert(sessionsTable).values({ token, userId: user.id });

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

router.post("/auth/logout", requireAuth, async (req: any, res) => {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, req.token));
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
