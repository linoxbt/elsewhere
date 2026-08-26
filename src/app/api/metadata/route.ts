import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { clientIp, rateLimit } from "@/server/rateLimit";

export const dynamic = "force-dynamic";

// Real image bytes now always go through /api/upload first and come back as
// a short ipfs:// URI or /uploads/... path (see create/page.tsx and
// api/upload/route.ts) — this body should never legitimately be large.
const MAX_BODY_BYTES = 32 * 1024;
const MAX_FIELD_LEN = 2_000;

function isPlainString(v: unknown, max: number): v is string {
  return typeof v === "string" && v.length <= max;
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`metadata:${clientIp(req)}`, 15, 60_000)) {
    return NextResponse.json({ error: "too many requests, slow down" }, { status: 429 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined && val !== null && !isPlainString(val, MAX_FIELD_LEN)) {
      return NextResponse.json({ error: `field "${key}" is invalid` }, { status: 400 });
    }
  }

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
      /* fall through to local disk */
    }
  }
  try {
    const hash = crypto.createHash("sha256").update(json).digest("hex").slice(0, 24);
    const dir = path.join(process.cwd(), "public", "meta");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${hash}.json`), json);
    return NextResponse.json({ uri: `/meta/${hash}.json` });
  } catch (e) {
    // No data: URI fallback here either — same reasoning as api/upload:
    // this URI is submitted directly as on-chain calldata.
    console.error("[metadata] both pinata and local disk failed", e);
    return NextResponse.json({ error: "metadata storage unavailable, try again" }, { status: 502 });
  }
}
