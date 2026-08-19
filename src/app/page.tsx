import Link from "next/link";

const products = [
  { href: "/create", title: "Launch", copy: "Deploy a token and bonding curve in one transaction. Image, ticker, socials, optional first buy." },
  { href: "/discover", title: "Discover", copy: "Watch new launches, market cap, volume, and graduates as they move toward the AMM." },
  { href: "/swap", title: "Swap", copy: "Trade official QIEdex pools on mainnet and Elsewhere pairs on testnet." },
  { href: "/pools", title: "Pools", copy: "Add or remove liquidity. Create pairs. Earn the LP cut of every swap." },
  { href: "/lend", title: "Lend", copy: "Supply QIE as collateral and borrow ELSE. Utilization sets the live APR." },
  { href: "/send", title: "Send", copy: "Pay one address or fan out a batch of native QIE / ERC-20 in a single flow." },
];

const steps = [
  { n: "01", t: "Connect", d: "Open the Reown modal. Injected wallets and WalletConnect QR, QIE chains included." },
  { n: "02", t: "Pick a network", d: "Testnet for launchpad, lend, and send. Mainnet for official QIEdex swaps." },
  { n: "03", t: "Launch or trade", d: "Create a token, buy the curve, or swap a listed pool. Graduation is automatic at $25k." },
  { n: "04", t: "Put capital to work", d: "Supply QIE, borrow ELSE, LP a pair, or send tokens out in batch." },
];

const stats = [
  { k: "Graduation", v: "$25,000", d: "bonding-curve market cap" },
  { k: "Create fee", v: "$2.50", d: "paid in native QIE" },
  { k: "Chains", v: "1983 / 1990", d: "QIE testnet + mainnet" },
  { k: "Swap source", v: "QIEdex", d: "official factory + router" },
];

export default function LandingPage() {
  return (
    <div className="-mx-3 -my-5 sm:-mx-4 sm:-my-8">
      <section className="relative overflow-hidden border-b border-line px-3 py-10 sm:px-4 sm:py-16 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_70%_-80px,rgba(196,181,160,0.12),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:gap-8 lg:gap-12">
          <div className="min-w-0 lp-fade">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint sm:text-[11px]">
              launchpad · amm · money market
            </p>
            <h1 className="mt-2 font-mono text-[22px] leading-[1.15] tracking-tight text-ink sm:mt-4 sm:text-4xl lg:text-6xl">
              Launch, trade, and lend on QIE in one place.
            </h1>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted sm:mt-5 sm:text-base lg:text-lg">
              Elsewhere is the unified token launchpad and AMM for QIE. Bonding-curve launches
              graduate into live pools. Swap reads official QIEdex liquidity. Lend QIE, borrow ELSE.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
              <Link href="/discover" className="btn-cta rounded-sm px-3 py-2 font-mono text-[11px] sm:px-4 sm:text-[12px]">
                open app
              </Link>
              <Link
                href="/create"
                className="rounded-sm border border-line px-3 py-2 font-mono text-[11px] hover:bg-elev-2 sm:px-4 sm:text-[12px]"
              >
                create a token
              </Link>
              <Link
                href="/docs"
                className="rounded-sm border border-line px-3 py-2 font-mono text-[11px] text-muted hover:text-ink sm:px-4 sm:text-[12px]"
              >
                read the docs
              </Link>
            </div>
          </div>
          <div className="lp-fade lp-d2 justify-self-end">
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

      <section className="border-b border-line px-3 py-8 sm:px-4 sm:py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.k}
              className={`lp-fade lp-d${i + 1} rounded-sm border border-line bg-elev px-3 py-3 sm:px-4 sm:py-4`}
            >
              <p className="font-mono text-[9px] uppercase tracking-widest text-faint sm:text-[10px]">{s.k}</p>
              <p className="mt-1 font-mono text-base text-ink sm:text-xl">{s.v}</p>
              <p className="mt-1 text-[11px] text-muted sm:text-[12px]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-line px-3 py-12 sm:px-4 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="lp-fade font-mono text-[11px] uppercase tracking-widest text-faint">suite</p>
          <h2 className="lp-fade lp-d1 mt-2 font-mono text-xl tracking-tight sm:text-2xl">Everything in the product</h2>
          <div className="mt-6 grid gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {products.map((p, i) => (
              <Link
                key={p.href}
                href={p.href}
                className={`lp-card lp-fade lp-d${(i % 4) + 1} group rounded-sm border border-line bg-elev p-4 hover:border-line-strong hover:bg-elev-2`}
              >
                <p className="font-mono text-[13px] text-ink">{p.title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{p.copy}</p>
                <p className="mt-3 font-mono text-[11px] text-accent group-hover:underline">{p.href}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line px-3 py-12 sm:px-4 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="lp-fade font-mono text-[11px] uppercase tracking-widest text-faint">how it works</p>
          <h2 className="lp-fade lp-d1 mt-2 font-mono text-xl tracking-tight sm:text-2xl">Four steps, one stack</h2>
          <div className="mt-6 grid gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-3 md:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.n} className={`lp-card lp-fade lp-d${i + 1} rounded-sm border border-line p-4`}>
                <p className="font-mono text-[11px] text-faint">{s.n}</p>
                <p className="mt-2 font-mono text-[14px] text-ink">{s.t}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-3 py-12 sm:px-4 sm:py-16">
        <div className="lp-fade mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 rounded-sm border border-line bg-elev px-4 py-8 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-10">
          <div>
            <h2 className="font-mono text-xl tracking-tight sm:text-2xl">Ready when you are.</h2>
            <p className="mt-2 max-w-lg text-sm text-muted">
              Testnet launchpad is live. Mainnet swap already talks to official QIE pools.
              Connect with Reown and pick a chain.
            </p>
          </div>
          <Link href="/discover" className="btn-cta shrink-0 rounded-sm px-4 py-2 font-mono text-[12px]">
            enter elsewhere
          </Link>
        </div>
      </section>
    </div>
  );
}
