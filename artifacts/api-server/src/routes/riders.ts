import { Router } from "express";
import { db, bikesTable } from "@workspace/db";
import { ridersTable } from "@workspace/db/src/schema/riders";
import { eq } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

const formatRider = async (r: typeof ridersTable.$inferSelect) => {
  const [bike] = await db.select().from(bikesTable).where(eq(bikesTable.id, r.bikeId));
  return {
    id: r.id,
    name: r.name,
    age: r.age,
    phone: r.phone,
    emergencyContactName: r.emergencyContactName,
    emergencyContactPhone: r.emergencyContactPhone,
    emergencyContactAge: r.emergencyContactAge,
    bikeId: r.bikeId,
    bikeName: bike?.name ?? "Unknown",
    createdAt: r.createdAt.toISOString(),
  };
};

router.get("/riders", requireAuth, async (req, res) => {
  try {
    const riders = await db.select().from(ridersTable).orderBy(ridersTable.name);
    const allBikes = await db.select().from(bikesTable);
    const bikeMap = new Map(allBikes.map(b => [b.id, b.name]));
    return res.json(riders.map(r => ({
      id: r.id,
      name: r.name,
      age: r.age,
      phone: r.phone,
      emergencyContactName: r.emergencyContactName,
      emergencyContactPhone: r.emergencyContactPhone,
      emergencyContactAge: r.emergencyContactAge,
      bikeId: r.bikeId,
      bikeName: bikeMap.get(r.bikeId) ?? "Unknown",
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/riders/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [rider] = await db.select().from(ridersTable).where(eq(ridersTable.id, id));
    if (!rider) return res.status(404).json({ error: "Rider not found" });
    return res.json(await formatRider(rider));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/riders", requireAuth, async (req, res) => {
  try {
    const { name, age, phone, emergencyContactName, emergencyContactPhone, emergencyContactAge, bikeId } = req.body;
    if (!name || age === undefined || !phone || !emergencyContactName || !emergencyContactPhone || emergencyContactAge === undefined || !bikeId) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const [rider] = await db.insert(ridersTable).values({
      name,
      age: parseInt(age),
      phone,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactAge: parseInt(emergencyContactAge),
      bikeId: parseInt(bikeId),
    }).returning();
    return res.status(201).json(await formatRider(rider));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/riders/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, age, phone, emergencyContactName, emergencyContactPhone, emergencyContactAge, bikeId } = req.body;
    const updates: any = {};
    if (name) updates.name = name;
    if (age !== undefined) updates.age = parseInt(age);
    if (phone) updates.phone = phone;
    if (emergencyContactName) updates.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone) updates.emergencyContactPhone = emergencyContactPhone;
    if (emergencyContactAge !== undefined) updates.emergencyContactAge = parseInt(emergencyContactAge);
    if (bikeId) updates.bikeId = parseInt(bikeId);
    const [rider] = await db.update(ridersTable).set(updates).where(eq(ridersTable.id, id)).returning();
    if (!rider) return res.status(404).json({ error: "Rider not found" });
    return res.json(await formatRider(rider));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/riders/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(ridersTable).where(eq(ridersTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
