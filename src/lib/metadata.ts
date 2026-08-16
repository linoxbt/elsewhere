export type TokenMetadataJson = {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
};

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

export function resolveUri(uri?: string): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    return `${IPFS_GATEWAYS[0]}${uri.slice("ipfs://".length)}`;
  }
  return uri;
}

export async function fetchMetadata(uri: string): Promise<TokenMetadataJson> {
  if (!uri) return {};
  try {
    if (uri.startsWith("data:application/json")) {
      const b64 = uri.split(",")[1] ?? "";
      const text =
        typeof Buffer !== "undefined"
          ? Buffer.from(b64, "base64").toString("utf8")
          : atob(b64);
      const json = JSON.parse(text) as TokenMetadataJson;
      if (json.image) json.image = resolveUri(json.image);
      return json;
    }
    const url = resolveUri(uri);
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const json = (await res.json()) as TokenMetadataJson;
    if (json.image) json.image = resolveUri(json.image);
    return json;
  } catch {
    return {};
  }
}

export function addressGradient(addr: string): string {
  const h = addr.toLowerCase().replace(/^0x/, "");
  const a = parseInt(h.slice(0, 6) || "888888", 16);
  const b = parseInt(h.slice(6, 12) || "444444", 16);
  const c1 = `#${(a & 0xffffff).toString(16).padStart(6, "0")}`;
  const c2 = `#${(b & 0xffffff).toString(16).padStart(6, "0")}`;
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}
