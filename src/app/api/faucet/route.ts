import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";

export const dynamic = "force-dynamic";

const ADMIN = "https://admin-api.qie.digital";
const PUBLIC = "https://www.qie.digital/faucet";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const address = String(body.address ?? "");
  if (!isAddress(address)) {
    return NextResponse.json({ ok: false, error: "invalid address" }, { status: 400 });
  }

  const check = await fetch(`${ADMIN}/api/test-token/check-validity`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ walletAddress: address }),
  });
  const validity = await check.json().catch(() => ({}));

  if (validity?.success === false) {
    return NextResponse.json({
      ok: false,
      error: validity.message || "not eligible",
      faucet: PUBLIC,
    });
  }

  // Official send is a private faucet action. We only check eligibility
  // then send the user to the official faucet to complete the drop.
  return NextResponse.json({
    ok: false,
    needsOfficial: true,
    error: "complete the send on the official qie faucet (2 QIE / 24h)",
    faucet: PUBLIC,
    eligible: true,
  });
}
