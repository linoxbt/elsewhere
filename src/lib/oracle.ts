export type OracleSnapshot = {
  usd: number;
  usd8: bigint;
  updatedAt: number;
  stale: boolean;
  ageSec: number;
};

export function decodeOracleRound(
  answer: bigint,
  updatedAt: bigint,
  nowSec = Math.floor(Date.now() / 1000),
): OracleSnapshot {
  const usd = Number(answer) / 1e8;
  const ts = Number(updatedAt);
  const ageSec = Math.max(0, nowSec - ts);
  return {
    usd,
    usd8: answer,
    updatedAt: ts,
    stale: ts === 0 || ageSec > 48 * 3600 || answer <= 0n,
    ageSec,
  };
}

/** Same formula as LaunchpadFactory.creationFeeQie(): $2.50 in 18-decimal USD. */
export function creationFeeQieFromOracle(usd8: bigint): bigint {
  if (usd8 <= 0n) return 0n;
  const usd18 = 2_500_000_000_000_000_000n;
  return (usd18 * 100_000_000n) / usd8;
}

export function formatOracleAge(ageSec: number) {
  if (ageSec < 60) return `${ageSec}s ago`;
  if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m ago`;
  if (ageSec < 86400) return `${Math.floor(ageSec / 3600)}h ago`;
  return `${Math.floor(ageSec / 86400)}d ago`;
}
