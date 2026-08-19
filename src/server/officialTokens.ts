import type { NetworkKey } from "@/lib/networks";
import type { TokenMeta } from "@/lib/types";
import { liveSwapTokens } from "./liveListings";

export async function officialTokens(key: NetworkKey): Promise<TokenMeta[]> {
  return liveSwapTokens(key);
}
