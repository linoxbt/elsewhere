import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { Marquee } from "@/components/Marquee";
import { LivePricePill } from "@/components/LivePricePill";
import { ParallaxLayer } from "@/components/ParallaxLayer";
import { AnimatedBondingCurveMotif } from "@/components/motifs/AnimatedBondingCurve";
import { BondingCurveMotif } from "@/components/motifs/BondingCurve";
import { LiquidityRingsMotif } from "@/components/motifs/LiquidityRings";
import { NetworkNodesMotif } from "@/components/motifs/NetworkNodes";
import { CandleTicksMotif } from "@/components/motifs/CandleTicks";

const products = [
  { href: "/create", title: "Launch", copy: "Deploy a token and bonding curve in one transaction. Image, ticker, socials, optional first buy." },
  { href: "/discover", title: "Discover", copy: "Watch new launches, market cap, volume, and graduates as they move toward the AMM." },
  { href: "/swap", title: "Swap", copy: "Trade official QIEdex pools on mainnet and Elsewhere pairs on testnet." },
  { href: "/pools", title: "Pools", copy: "Add or remove liquidity. Create pairs. Earn the LP cut of every swap." },
  { href: "/lend", title: "Lend", copy: "Supply QIE to earn yield, or post any launched token as collateral and borrow QIE against it." },
  { href: "/send", title: "Send", copy: "Pay one address or fan out a batch of native QIE / ERC-20 in a single flow." },
];

const steps = [
  { n: "01", t: "Connect", d: "Open the Reown modal. Injected wallets and WalletConnect QR, QIE chains included." },
  { n: "02", t: "Pick a network", d: "Testnet for launchpad, lend, and send. Mainnet for official QIEdex swaps." },
  { n: "03", t: "Launch or trade", d: "Create a token, buy the curve, or swap a listed pool. Graduation is automatic at $25k." },
  { n: "04", t: "Put capital to work", d: "Supply QIE, borrow against collateral, LP a pair, or send tokens out in batch." },
];

const stats = [
  { k: "Graduation", v: "$25,000", d: "bonding-curve market cap" },
  { k: "Create fee", v: "$2.50", d: "paid in native QIE" },
  { k: "Chains", v: "1983 / 1990", d: "QIE testnet + mainnet" },
  { k: "Swap source", v: "QIEdex", d: "official factory + router" },
];

const principles = [
  {
    n: "01",
    t: "Fair by construction",
    d: "Every launch starts on the same constant-product bonding curve with the same $25,000 graduation threshold and the same fee split. No presale, no admin mint, no early allocation only the creator gets.",
  },
  {
    n: "02",
    t: "Priced honestly",
    d: "Collateral in the lending market is valued off a 30-minute time-weighted average, not a spot price a single transaction can move. What you see is what the protocol actually enforces.",
  },
  {
    n: "03",
    t: "Yours the whole way",
    d: "Connect with Reown and keep custody of your own keys. Swap reads the same official QIEdex liquidity your wallet already sees Elsewhere routes trades, it never holds your funds.",
  },
];

const badges = [
  "non-custodial",
  "TWAP-protected lending",
  "official QIEdex liquidity",
  "open-source contracts",
  "foundry-tested",
];

const stack = ["QIE CHAIN", "REOWN", "QIEDEX", "FOUNDRY", "NEXT.JS", "VIEM", "WAGMI"];

export default function LandingPage() {
  return (
    <div className="-mx-3 -my-5 sm:-mx-4 sm:-my-8">
      {/* ── hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line px-3 py-10 sm:px-4 sm:py-16 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_70%_-80px,rgba(196,181,160,0.12),transparent_60%)]" />
        <div className="pointer-events-none absolute -right-[10%] -top-[8%] w-[85%] text-accent opacity-[0.16] sm:-right-[5%] sm:w-[62%] lg:w-[52%]">
          <AnimatedBondingCurveMotif />
        </div>
        <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:gap-8 lg:gap-12">
          <div className="min-w-0 lp-fade">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint sm:text-[12px]">
                launchpad · amm · money market
              </p>
              <LivePricePill />
            </div>
            <h1 className="mt-2 font-mono text-[23px] leading-[1.15] tracking-tight text-ink sm:mt-4 sm:text-4xl lg:text-6xl">
              Launch, trade, and lend on QIE in one place.
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted sm:mt-5 sm:text-base lg:text-lg">
              Elsewhere is the unified token launchpad and AMM for QIE. Bonding-curve launches
              graduate into live pools. Swap reads official QIEdex liquidity. Lend QIE, borrow
              against any launched token.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
              <Link href="/discover" className="btn-cta rounded-sm px-3 py-2 font-mono text-[12px] sm:px-4 sm:text-[13px]">
                open app
              </Link>
              <Link
                href="/create"
                className="rounded-sm border border-line px-3 py-2 font-mono text-[12px] hover:bg-elev-2 sm:px-4 sm:text-[13px]"
              >
                create a token
              </Link>
              <Link
                href="/docs"
                className="rounded-sm border border-line px-3 py-2 font-mono text-[12px] text-muted hover:text-ink sm:px-4 sm:text-[13px]"
              >
                read the docs
              </Link>
            </div>
          </div>
          <div className="lp-fade lp-d2 relative justify-self-end">
            <div className="lp-glow pointer-events-none absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,rgba(196,181,160,0.35),transparent_65%)] blur-2xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/mark.jpg"
              alt="elsewhere"
              width={360}
              height={360}
              className="lp-float h-24 w-24 rounded-sm object-cover shadow-[0_16px_48px_rgba(0,0,0,0.35)] sm:h-52 sm:w-52 lg:h-80 lg:w-80"
            />
          </div>
        </div>
      </section>

      {/* ── stats ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line px-3 py-8 sm:px-4 sm:py-10">
        <ParallaxLayer speed={30} className="pointer-events-none absolute -left-[12%] top-1/2 hidden w-[40%] -translate-y-1/2 text-line-strong opacity-40 sm:block">
          <CandleTicksMotif />
        </ParallaxLayer>
        <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.k} delay={i * 70} variant="up">
              <div className="lp-card rounded-sm border border-line bg-elev px-3 py-3 sm:px-4 sm:py-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-faint sm:text-[11px]">{s.k}</p>
                <p className="mt-1 font-mono text-lg text-ink sm:text-2xl">{s.v}</p>
                <p className="mt-1 text-[12px] text-muted sm:text-[13px]">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── why elsewhere ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line px-3 py-12 sm:px-4 sm:py-16">
        <ParallaxLayer
          speed={50}
          scaleFrom={1.12}
          className="pointer-events-none absolute -right-[18%] top-0 w-[70%] text-accent-2 opacity-[0.12] sm:-right-[8%] sm:w-[46%]"
        >
          <LiquidityRingsMotif />
        </ParallaxLayer>
        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <p className="font-mono text-[12px] uppercase tracking-widest text-faint">why elsewhere</p>
            <h2 className="mt-2 max-w-2xl font-mono text-xl tracking-tight sm:text-2xl lg:text-3xl">
              Clarity first. The protocol enforces what the copy promises.
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:mt-10 lg:grid-cols-3">
            {principles.map((p, i) => (
              <Reveal key={p.n} delay={i * 90} variant={i === 1 ? "scale" : i === 0 ? "left" : "right"} className="bg-bg">
                <div className="h-full px-4 py-6 sm:px-6 sm:py-8">
                  <p className="font-mono text-[12px] text-faint">{p.n}</p>
                  <p className="mt-3 font-mono text-[16px] text-ink sm:text-[17px]">{p.t}</p>
                  <p className="mt-3 text-[14px] leading-relaxed text-muted">{p.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── product suite ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line px-3 py-12 sm:px-4 sm:py-16">
        <ParallaxLayer
          speed={40}
          fade
          className="pointer-events-none absolute left-1/2 top-1/2 hidden w-[60%] -translate-x-1/2 -translate-y-1/2 text-line-strong opacity-[0.18] md:block"
        >
          <NetworkNodesMotif />
        </ParallaxLayer>
        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <p className="font-mono text-[12px] uppercase tracking-widest text-faint">suite</p>
            <h2 className="mt-2 font-mono text-xl tracking-tight sm:text-2xl">Everything in the product</h2>
          </Reveal>
          <div className="mt-6 grid gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {products.map((p, i) => (
              <Reveal key={p.href} delay={(i % 3) * 80} variant="scale">
                <Link
                  href={p.href}
                  className="lp-card group block rounded-sm border border-line bg-elev p-4 hover:border-line-strong hover:bg-elev-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[14px] text-ink">{p.title}</p>
                    <p className="font-mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</p>
                  </div>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">{p.copy}</p>
                  <p className="mt-3 font-mono text-[12px] text-accent group-hover:underline">{p.href}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── how it works ─────────────────────────────────────────────── */}
      <section className="border-b border-line px-3 py-12 sm:px-4 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="font-mono text-[12px] uppercase tracking-widest text-faint">how it works</p>
            <h2 className="mt-2 font-mono text-xl tracking-tight sm:text-2xl">Four steps, one stack</h2>
          </Reveal>
          <div className="mt-6 grid gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-3 md:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 80} variant="up">
                <div className="lp-card h-full rounded-sm border border-line p-4">
                  <p className="font-mono text-[12px] text-faint">{s.n}</p>
                  <p className="mt-2 font-mono text-[15px] text-ink">{s.t}</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── trust badges ─────────────────────────────────────────────── */}
      <section className="border-b border-line px-3 py-8 sm:px-4 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {badges.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-line bg-elev px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-muted sm:text-[12px]"
                >
                  {b}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── stack marquee ────────────────────────────────────────────── */}
      <section className="border-b border-line py-8 sm:py-10">
        <Reveal>
          <Marquee items={stack} />
        </Reveal>
      </section>

      {/* ── final cta ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-3 py-12 sm:px-4 sm:py-16">
        <Reveal variant="scale">
          <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 overflow-hidden rounded-sm border border-line bg-elev px-4 py-8 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-10">
            <div className="pointer-events-none absolute -bottom-[40%] -right-[10%] w-[55%] rotate-180 text-accent opacity-[0.1] sm:w-[34%]">
              <BondingCurveMotif />
            </div>
            <div className="relative">
              <h2 className="font-mono text-xl tracking-tight sm:text-2xl">Ready when you are.</h2>
              <p className="mt-2 max-w-lg text-sm text-muted">
                Testnet launchpad is live. Mainnet swap already talks to official QIE pools.
                Connect with Reown and pick a chain.
              </p>
            </div>
            <Link href="/discover" className="btn-cta relative shrink-0 rounded-sm px-4 py-2 font-mono text-[13px]">
              enter elsewhere
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
