"use client";

import { useEffect, useRef } from "react";
import type { Candle } from "@/lib/types";

export function PriceChart({ candles }: { candles: Candle[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let disposed = false;
    let chart: { remove: () => void } | null = null;

    (async () => {
      const { createChart, ColorType, AreaSeries } = await import("lightweight-charts");
      if (disposed || !ref.current) return;
      const created = createChart(ref.current, {
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: "#0c0c0c" },
          textColor: "#7a746a",
          fontFamily: "ui-monospace, monospace",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "#141414" },
          horzLines: { color: "#141414" },
        },
        rightPriceScale: { borderColor: "#1c1c1c" },
        timeScale: { borderColor: "#1c1c1c" },
        crosshair: { vertLine: { color: "#3a3a3a" }, horzLine: { color: "#3a3a3a" } },
      });
      chart = created;
      const series = created.addSeries(AreaSeries, {
        lineColor: "#c4b5a0",
        topColor: "rgba(196,181,160,0.25)",
        bottomColor: "rgba(196,181,160,0.00)",
        lineWidth: 2,
      });
      const data = (candles.length ? candles : [{ time: Math.floor(Date.now() / 1000), close: 0 }]).map(
        (c) => ({ time: c.time as number, value: c.close }),
      );
      series.setData(data as never);
    })();

    return () => {
      disposed = true;
      chart?.remove();
    };
  }, [candles]);

  return <div ref={ref} className="h-64 w-full rounded-sm border border-line bg-elev" />;
}
