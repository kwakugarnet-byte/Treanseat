import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin, hashPin } from "./auth";

const router = Router();

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
    return res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      monthlySalary: parseFloat(u.monthlySalary),
      createdAt: u.createdAt.toISOString(),
    })));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", requireAdmin, async (req, res) => {
  try {
    const { name, pin, role } = req.body;
    if (!name || !pin || !role) {
      return res.status(400).json({ error: "name, pin, and role are required" });
    }
    if (!["admin", "manager"].includes(role)) {
      return res.status(400).json({ error: "role must be admin or manager" });
    }
    const hashed = hashPin(String(pin));
    const [user] = await db.insert(usersTable).values({ name, pin: hashed, role }).returning();
    return res.status(201).json({
      id: user.id,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({
      id: user.id,
      name: user.name,
      role: user.role,
      monthlySalary: parseFloat(user.monthlySalary),
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, pin, role, monthlySalary } = req.body;
    const updates: any = {};
    if (name) updates.name = name;
    if (pin) updates.pin = hashPin(String(pin));
    if (monthlySalary !== undefined) updates.monthlySalary = String(monthlySalary);
    if (role) {
      if (!["admin", "manager"].includes(role)) {
        return res.status(400).json({ error: "role must be admin or manager" });
      }
      updates.role = role;
    }
    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({
      id: user.id,
      name: user.name,
      role: user.role,
      monthlySalary: parseFloat(user.monthlySalary),
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(usersTable).where(eq(usersTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
