import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

// Return YYYY-MM-DD
function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case "GET":
        return await handleGET(req, res);
      case "POST":
        return await handlePOST(req, res);
      case "PATCH":
        return await handlePATCH(req, res);
      case "DELETE":
        return await handleDELETE(req, res);
      default:
        return res.status(405).json({ error: "Method Not Allowed" });
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    return res
      .status(500)
      .json({
        error: (err as { message: string }).message || "Internal server error",
      });
  }
}

// GET /api/registry?status=done
async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const all = await prisma.registry.findMany({
    include: { items: true },
  });

  const dates = all.map((r) => r.date);
  const latestDate = dates.length ? dates.sort().at(-1) : null;
  const isDone = req.query.status === "done";

  const result = all.filter((r) =>
    isDone
      ? r.status === "done" || r.date === latestDate
      : r.status !== "done" && r.date === latestDate
  );

  return res.status(200).json(result);
}

// POST /api/registry
async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const { name, number } = req.body;
  if (typeof name !== "string" || typeof number !== "string") {
    return res
      .status(400)
      .json({ error: '"name" and "number" must be strings.' });
  }

  const today = getTodayString();
  const todayEntries = await prisma.registry.findMany({
    where: { date: today },
  });
  const usedIds = new Set(todayEntries.map((r) => r.id));

  if (usedIds.size >= 601) {
    return res.status(500).json({ error: "No more available IDs for today." });
  }

  function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  let newId;
  do {
    newId = getRandomInt(100, 700);
  } while (usedIds.has(newId));

  const entry = await prisma.registry.create({
    data: {
      id: newId,
      name: name.trim(),
      number: number.trim(),
      date: today,
      status: "pending",
      totalPrice: 0,
    },
  });

  return res.status(201).json(entry);
}

// PATCH /api/registry
async function handlePATCH(req: NextApiRequest, res: NextApiResponse) {
  const { id, date, action, billItems } = req.body;
  if (!id || typeof date !== "string" || typeof action !== "string") {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const registry = await prisma.registry.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!registry || registry.date !== date) {
    return res.status(404).json({ error: `Registry entry not found.` });
  }

  if (action === "hold") {
    if (registry.status === "done") {
      return res.status(400).json({ error: "Cannot hold a done entry." });
    }
    const updated = await prisma.registry.update({
      where: { id },
      data: { status: "on-hold" },
    });
    return res.status(200).json(updated);
  }

  if (action === "createBill") {
    if (
      !Array.isArray(billItems) ||
      billItems.some(
        (i) => typeof i.productId !== "number" || typeof i.quantity !== "number"
      )
    ) {
      return res
        .status(400)
        .json({
          error: '"billItems" must be an array of { productId, quantity }.',
        });
    }

    const productIds = billItems.map((b) => b.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    let total = 0;
    const enrichedItems = billItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new Error(`Product not found: ${item.productId}`);
      const subTotal = item.quantity * product.price;
      total += subTotal;
      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
        subTotal,
      };
    });

    await prisma.registryItem.deleteMany({ where: { registryId: id } });

    const createItems = enrichedItems.map((i) => ({
      ...i,
      registryId: id,
    }));

    await prisma.registryItem.createMany({ data: createItems });

    const updated = await prisma.registry.update({
      where: { id },
      data: {
        status: "done",
        totalPrice: parseFloat(total.toFixed(2)),
      },
      include: { items: true },
    });

    return res.status(200).json(updated);
  }

  return res.status(400).json({ error: `Unknown action: ${action}` });
}

// DELETE /api/registry
async function handleDELETE(req: NextApiRequest, res: NextApiResponse) {
  const { id, date } = req.body;
  if (typeof id !== "number" || typeof date !== "string") {
    return res
      .status(400)
      .json({ error: '"id" must be a number and "date" must be a string.' });
  }

  const registry = await prisma.registry.findUnique({ where: { id } });
  if (!registry || registry.date !== date) {
    return res.status(404).json({ error: "Registry entry not found." });
  }

  await prisma.registryItem.deleteMany({ where: { registryId: id } });
  await prisma.registry.delete({ where: { id } });

  return res
    .status(200)
    .json({ message: `Deleted entry id=${id} on ${date}.` });
}
