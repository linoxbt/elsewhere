import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const MAX = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export async function POST(req: NextRequest) {
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
  const ext = file.type === "image/png" ? "png" : file.type === "image/gif" ? "gif" : file.type === "image/webp" ? "webp" : "jpg";

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

  const dataUri = `data:${file.type};base64,${buf.toString("base64")}`;
  try {
    const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 24);
    const dir = path.join(process.cwd(), "public", "uploads");
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${hash}.${ext}`;
    fs.writeFileSync(path.join(dir, filename), buf);
    const url = `/uploads/${filename}`;
    return NextResponse.json({ uri: url, url });
  } catch {
    return NextResponse.json({ uri: dataUri, url: dataUri });
  }
}
