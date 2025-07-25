// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const authPAth = path.join(process.cwd(), "data", "auth.json");
const password = process.env.password;

if (!password) {
  process.exit("need password to continue");
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method == "GET") {
    const data = JSON.parse(fs.readFileSync(authPAth, "utf8")) as {
      lastLogInDate: Date;
    }[];

    if (!data) {
      return res.send(403);
    }
    const lastLogInDate = new Date(data[0].lastLogInDate);
    const now = new Date();

    // Calculate difference in milliseconds
    const diffInMs = now.getTime() - lastLogInDate.getTime();

    // Convert to days
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInDays <= 3) {
      return res.send(200);
    } else {
      return res.send(403);
    }
  } else if (req.method === "POST") {
    const body = req.body;

    if (body.password === password) {
      fs.writeFileSync(
        authPAth,
        JSON.stringify([
          {
            lastLogInDate: new Date(),
          },
        ]),
        "utf8"
      );

      return res.send(200);
    } else {
      return res.send(403);
    }
  } else {
    return res.status(500).json({ error: "55555555555555555555555555555 " });
  }
}
