import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { Product, Registry } from "@/type";

const dataDir = path.join(process.cwd(), "data");
const registryFile = path.join(dataDir, "registry.json");

/** Return “YYYY-MM-DD” for today. */
function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readRegistry(): Registry[] {
  try {
    const raw = fs.readFileSync(registryFile, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading registry.json:", err);
    return [];
  }
}

function writeRegistry(arr: Registry[]) {
  try {
    fs.writeFileSync(registryFile, JSON.stringify(arr, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing registry.json:", err);
    throw err;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    await POST(req, res);
  } else if (req.method === "GET") {
    await GET(req, res);
  } else if (req.method === "DELETE") {
    await DELETE(req, res);
  } else if (req.method === "PATCH") {
    await PATCH(req, res);
  } else {
    return res.status(500).json({ error: "55555555555555555555555555555 " });
  }
}

/**
 * GET /api/registry?status=done
 * → if status=done  : return only done entries
 * → otherwise       : return only pending + on-hold entries
 */
async function GET(request: NextApiRequest, res: NextApiResponse) {
  try {
    const allRegs = readRegistry();

    // 1) find the latest date string (assumes 'YYYY-MM-DD' format)
    const dates = allRegs.map((r) => r.date);
    const latestDate = dates.length ? dates.sort().slice(-1)[0] : null;

    // 2) read the status filter
    const searchParams = request.query;
    const filterStatus = searchParams["status"];

    let result;
    if (filterStatus === "done") {
      // all done + everything from latestDate
      result = allRegs.filter(
        (r) => r.status === "done" || r.date === latestDate
      );
    } else {
      // only pending/on-hold on the latestDate
      result = allRegs.filter(
        (r) => r.status !== "done" && r.date === latestDate
      );
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Error in GET /api/registry:", err);
    return res.status(500).json({ error: "Failed to read registry data." });
  }
}
/**
 * POST /api/registry
 * Body: { name: string, number: string }
 * → creates a new entry (status="pending", no bill yet)
 */
async function POST(request: NextApiRequest, res: NextApiResponse) {
  try {
    const body = await request.body;
    const { name, number } = body;
    if (typeof name !== "string" || typeof number !== "string") {
      return res
        .status(400)
        .json({ error: '"name" and "number" must be strings.' });
    }

    const allRegs = readRegistry();
    const today = getTodayString();
    // get entries for today
    const todayEntries = allRegs.filter((r) => r.date === today);

    // build a Set of already-used IDs for today
    const usedIds = new Set(todayEntries.map((r) => r.id));

    // total possible IDs in [100..700] is 601; if we’ve exhausted them, fail
    if (usedIds.size >= 601) {
      return res
        .status(500)
        .json({ error: "No more available IDs for today." });
    }

    // helper: random int between min and max inclusive
    function getRandomInt(min: number, max: number) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // pick a random unused ID
    let nextId;
    do {
      nextId = getRandomInt(100, 700);
    } while (usedIds.has(nextId));

    // new entry has default status = "pending"
    const newEntry = {
      id: nextId,
      name: name.trim(),
      number: number.trim(),
      date: today,
      status: "pending",
      billItems: [],
      totalPrice: 0,
    };

    allRegs.push(newEntry);
    writeRegistry(allRegs);

    return res.status(201).json(newEntry);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to add registry entry." });
  }
}

/**
 * PATCH /api/registry
 * Body variations:
 *   1) { id: number, date: string, action: "hold" }
 *        → sets status="on-hold"
 *
 *   2) {
 *        id: number, date: string,
 *        action: "createBill",
 *        billItems: [ { productId: number, quantity: number } ]
 *      }
 *        → calculates totalPrice, sets status="done", attaches billItems & totalPrice
 */
async function PATCH(request: NextApiRequest, res: NextApiResponse) {
  try {
    const body = await request.body;
    const { id, date, action } = body;
    console.log(body);

    if (
      typeof id !== "number" ||
      typeof date !== "string" ||
      typeof action !== "string"
    ) {
      return res.status(400).json({
        error:
          '"id" (number), "date" (string), and "action" (string) are required.',
      });
    }

    const allRegs = readRegistry();
    // find index of matching entry
    const idx = allRegs.findIndex((r) => r.id === id && r.date === date);
    if (idx < 0) {
      return res.status(404).json({
        error: `No registry entry found with id=${id} on date=${date}.`,
      });
    }

    // clone to avoid mutating original until we write
    const entry = { ...allRegs[idx] };

    if (action === "hold") {
      // simply flip status to on-hold (only if not already done)
      if (entry.status === "done") {
        return res
          .status(400)
          .json({ error: "Cannot hold an entry that is already done." });
      }
      entry.status = "on-hold";
    } else if (action === "createBill") {
      // must supply billItems: [ { productId: number, quantity: number }, … ]
      const { billItems } = body;
      if (
        !Array.isArray(billItems) ||
        billItems.some(
          (it) =>
            typeof it.productId !== "number" || typeof it.quantity !== "number"
        )
      ) {
        return res.status(400).json({
          error: '"billItems" must be an array of { productId, quantity }.',
        });
      }

      // We need to lookup each product’s price from products.json
      const productsFile = path.join(dataDir, "products.json");
      let productsArr = [];
      try {
        const rawP = fs.readFileSync(productsFile, "utf8");
        productsArr = JSON.parse(rawP);
      } catch (err) {
        console.error("Error reading products.json:", err);
        return res
          .status(500)
          .json({ error: "Failed to read products data for billing." });
      }

      // Calculate totalPrice
      let total = 0;
      // build an enriched array: { productId, quantity, unitPrice, subTotal }
      const enrichedBill = billItems.map((item) => {
        const prod = productsArr.find((p: Product) => p.id === item.productId);
        if (!prod) {
          throw new Error(`Product not found: id=${item.productId}`);
        }
        const unitPrice = prod.price;
        const subTotal = unitPrice * item.quantity;
        total += subTotal;
        return {
          productId: item.productId,
          productName: prod.name,
          quantity: item.quantity,
          unitPrice,
          subTotal,
        };
      });

      // Attach to entry
      entry.billItems = enrichedBill;
      entry.totalPrice = parseFloat(total.toFixed(2));
      entry.status = "done";
    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    // overwrite the old entry
    allRegs[idx] = entry;
    writeRegistry(allRegs);

    return res.status(200).json(entry);
  } catch (err: unknown) {
    console.error(err);
    return res.status(500).json({
      error:
        (err as { message?: string })?.message || "Failed to update entry.",
    });
  }
}

/**
 * DELETE /api/registry
 * Body: { id: number, date: string }
 * → removes that entry entirely
 */
async function DELETE(request: NextApiRequest, res: NextApiResponse) {
  try {
    const body = await request.body;
    const { id, date } = body;
    if (typeof id !== "number" || typeof date !== "string") {
      return res
        .status(400)
        .json({ error: '"id" must be a number and "date" must be a string.' });
    }

    const allRegs = readRegistry();
    const exists = allRegs.some((r) => r.id === id && r.date === date);
    if (!exists) {
      return res.status(404).json({
        error: `No registry entry found with id=${id} on date=${date}.`,
      });
    }

    const updated = allRegs.filter((r) => !(r.id === id && r.date === date));
    writeRegistry(updated);
    return res.status(200).json({
      message: `Deleted entry id=${id} on ${date}.`,
      entries: updated,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete registry entry." });
  }
}
