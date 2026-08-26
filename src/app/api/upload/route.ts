import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { clientIp, rateLimit } from "@/server/rateLimit";

export const dynamic = "force-dynamic";

const MAX = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function sniffImageType(buf: Buffer): string | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (buf.length >= 6 && (buf.subarray(0, 6).toString("ascii") === "GIF87a" || buf.subarray(0, 6).toString("ascii") === "GIF89a")) {
    return "image/gif";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`upload:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "too many uploads, slow down" }, { status: 429 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > MAX) {
    return NextResponse.json({ error: "max 5MB" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "png/jpg/gif/webp only" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  // Don't trust the client-declared MIME type alone — verify the actual
  // file bytes match a real image signature before persisting or pinning it.
  const sniffed = sniffImageType(buf);
  if (!sniffed || sniffed !== file.type) {
    return NextResponse.json({ error: "file content doesn't match its declared type" }, { status: 400 });
  }
  const ext = sniffed === "image/png" ? "png" : sniffed === "image/gif" ? "gif" : sniffed === "image/webp" ? "webp" : "jpg";

  const pinata = process.env.PINATA_JWT;
  if (pinata) {
    try {
      const body = new FormData();
      body.append("file", new Blob([buf], { type: file.type }), file.name || `image.${ext}`);
      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${pinata}` },
        body,
      });
      if (res.ok) {
        const json = (await res.json()) as { IpfsHash: string };
        return NextResponse.json({
          uri: `ipfs://${json.IpfsHash}`,
          url: `https://gateway.pinata.cloud/ipfs/${json.IpfsHash}`,
        });
      }
    } catch (e) {
      console.warn("pinata failed, falling back to local", e);
    }
  }

  try {
    const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 24);
    const dir = path.join(process.cwd(), "public", "uploads");
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${hash}.${ext}`;
    fs.writeFileSync(path.join(dir, filename), buf);
    const url = `/uploads/${filename}`;
    return NextResponse.json({ uri: url, url });
  } catch (e) {
    // No data: URI fallback here on purpose: the caller (create/page.tsx)
    // embeds this URI directly in on-chain calldata, and a raw base64 image
    // is unboundedly large — better to fail the upload clearly than let a
    // multi-MB string get submitted as a transaction.
    console.error("[upload] both pinata and local disk failed", e);
    return NextResponse.json({ error: "upload storage unavailable, try again" }, { status: 502 });
  }
}
