import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const json = JSON.stringify(body);
  const pinata = process.env.PINATA_JWT;
  if (pinata) {
    try {
      const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pinata}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ pinataContent: body }),
      });
      if (res.ok) {
        const out = (await res.json()) as { IpfsHash: string };
        return NextResponse.json({ uri: `ipfs://${out.IpfsHash}` });
      }
    } catch {
      /* fall through */
    }
  }
  const hash = crypto.createHash("sha256").update(json).digest("hex").slice(0, 24);
  const dir = path.join(process.cwd(), "public", "meta");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${hash}.json`), json);
  return NextResponse.json({ uri: `/meta/${hash}.json` });
}
