import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { Product } from "@/type";

const dataDir = path.join(process.cwd(), "data");
const productsFile = path.join(dataDir, "products.json");

function readProducts() {
  try {
    const json = fs.readFileSync(productsFile, "utf8");
    return JSON.parse(json);
  } catch (err) {
    console.error("Error reading products.json:", err);
    return [];
  }
}

function writeProducts(products: Product[]) {
  try {
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing products.json:", err);
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
  } else {
    return res.status(500).json({ error: "55555555555555555555555555555 " });
  }
}
/**
 * GET /api/products
 * Returns the full array of products.
 */
async function GET(request: NextApiRequest, res: NextApiResponse) {
  try {
    const products = readProducts();
    return res.status(200).json(products);
  } catch {
    return res.status(500).json({ error: "Failed to read products data." });
  }
}

/**
 * POST /api/products
 * Expects JSON: { name: string, price: number }
 * Adds a new product, auto-incrementing `id`.
 */
async function POST(request: NextApiRequest, res: NextApiResponse) {
  try {
    const body = await request.body;
    const { name, price } = body;

    if (typeof name !== "string" || typeof price !== "number") {
      return res.status(400).json({
        error:
          'Invalid payload: "name" must be a string and "price" must be a number.',
      });
    }

    const products = readProducts();
    const newId =
      products.length > 0 ? products[products.length - 1].id + 1 : 1;
    const newProduct = { id: newId, name: name.trim(), price };

    products.push(newProduct);
    writeProducts(products);

    return res.status(201).json(newProduct);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to add product." });
  }
}

/**
 * DELETE /api/products
 * Expects JSON: { id: number }
 * Removes the product whose `id` matches. Returns the remaining array.
 */
export async function DELETE(request: NextApiRequest, res: NextApiResponse) {
  try {
    const body = await request.body;
    const { id } = body;

    if (typeof id !== "number") {
      return res
        .status(400)
        .json({ error: 'Invalid payload: "id" must be a number.' });
    }

    const products = readProducts();
    const exists = products.some((p: Product) => p.id === id);
    if (!exists) {
      return res.status(400).json({ error: `No product found with id=${id}.` });
    }

    const updated = products.filter((p: Product) => p.id !== id);
    writeProducts(updated);

    return res
      .status(200)
      .json({ message: `Product id=${id} deleted.`, products: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete product." });
  }
}
