// pages/api/auth.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

const password = process.env.password;

if (!password) {
  throw new Error("Missing required environment variable: password");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    const deviceId = Number(req.query.q);

    if (!deviceId || isNaN(deviceId)) {
      return res.status(401).json({ error: "Missing or invalid device ID" });
    }

    // Get the most recent login for that device
    const latest = await prisma.authLog.findFirst({
      where: { deviceId: req.query.q as string },
      orderBy: { loginDate: "desc" },
    });

    if (!latest) {
      return res.status(403).json({ error: "No login record found" });
    }

    const lastLogInDate = new Date(latest.loginDate);
    const now = new Date();
    const diffInDays =
      (now.getTime() - lastLogInDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffInDays <= 3) {
      return res.status(200).json({ authorized: true });
    } else {
      return res.status(403).json({ error: "Login expired" });
    }
  } else if (req.method === "POST") {
    const { password: pwd, deviceId } = req.body;

    if (pwd === password) {
      await prisma.authLog.create({
        data: {
          loginDate: new Date(),
          deviceId:String(deviceId),
        },
      });

      return res.status(200).json({ message: "Authorized" });
    } else {
      return res.status(403).json({ error: "Unauthorized" });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
