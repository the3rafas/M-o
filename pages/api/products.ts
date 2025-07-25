import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    return await handlePOST(req, res);
  } else if (req.method === "GET") {
    return await handleGET(req, res);
  } else if (req.method === "DELETE") {
    return await handleDELETE(req, res);
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}

/**
 * GET /api/products
 * Returns the full array of products.
 */
async function handleGET(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const products = await prisma.product.findMany();
    return res.status(200).json(products);
  } catch (err) {
    console.error("Failed to fetch products:", err);
    return res.status(500).json({ error: "Failed to read products data." });
  }
}

/**
 * POST /api/products
 * Expects JSON: { name: string, price: number }
 * Adds a new product.
 */
async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, price } = req.body;

    if (typeof name !== "string" || typeof price !== "number") {
      return res.status(400).json({
        error: 'Invalid payload: "name" must be a string and "price" must be a number.',
      });
    }

    const newProduct = await prisma.product.create({
      data: {
        name: name.trim(),
        price,
      },
    });

    return res.status(201).json(newProduct);
  } catch (err) {
    console.error("Failed to add product:", err);
    return res.status(500).json({ error: "Failed to add product." });
  }
}

/**
 * DELETE /api/products
 * Expects JSON: { id: number }
 * Deletes a product by id.
 */
async function handleDELETE(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.body;

    if (typeof id !== "number") {
      return res.status(400).json({ error: '"id" must be a number.' });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: `No product found with id=${id}.` });
    }

    await prisma.product.delete({ where: { id } });

    const remaining = await prisma.product.findMany();
    return res.status(200).json({
      message: `Product id=${id} deleted.`,
      products: remaining,
    });
  } catch (err) {
    console.error("Failed to delete product:", err);
    return res.status(500).json({ error: "Failed to delete product." });
  }
}
