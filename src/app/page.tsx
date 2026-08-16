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
    <div className="-mx-4 -my-8">
      <section className="relative overflow-hidden border-b border-line px-4 py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_50%_-80px,rgba(196,181,160,0.12),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
              launchpad · amm · money market
            </p>
            <h1 className="mt-4 max-w-3xl font-mono text-4xl leading-[1.1] tracking-tight text-ink sm:text-6xl">
              Launch, trade, and lend on QIE in one place.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Elsewhere is the unified token launchpad and AMM for QIE. Bonding-curve launches
              graduate into live pools. Swap reads official QIEdex liquidity. Lend QIE, borrow ELSE.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/discover" className="btn-cta rounded-sm px-4 py-2 font-mono text-[12px]">
                open app
              </Link>
              <Link
                href="/create"
                className="rounded-sm border border-line px-4 py-2 font-mono text-[12px] hover:bg-elev-2"
              >
                create a token
              </Link>
              <Link
                href="/docs"
                className="rounded-sm border border-line px-4 py-2 font-mono text-[12px] text-muted hover:text-ink"
              >
                read the docs
              </Link>
            </div>
          </div>
          <div className="justify-self-center lg:justify-self-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/mark.jpg"
              alt="elsewhere"
              width={360}
              height={360}
              className="h-56 w-56 rounded-sm object-cover shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:h-72 sm:w-72 lg:h-80 lg:w-80"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-line px-4 py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.k} className="rounded-sm border border-line bg-elev px-4 py-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-faint">{s.k}</p>
              <p className="mt-1 font-mono text-xl text-ink">{s.v}</p>
              <p className="mt-1 text-[12px] text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-line px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] uppercase tracking-widest text-faint">suite</p>
          <h2 className="mt-2 font-mono text-2xl tracking-tight">Everything in the product</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="group rounded-sm border border-line bg-elev p-4 hover:border-line-strong hover:bg-elev-2"
              >
                <p className="font-mono text-[13px] text-ink">{p.title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{p.copy}</p>
                <p className="mt-3 font-mono text-[11px] text-accent group-hover:underline">{p.href}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] uppercase tracking-widest text-faint">how it works</p>
          <h2 className="mt-2 font-mono text-2xl tracking-tight">Four steps, one stack</h2>
          <div className="mt-8 grid gap-3 md:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="rounded-sm border border-line p-4">
                <p className="font-mono text-[11px] text-faint">{s.n}</p>
                <p className="mt-2 font-mono text-[14px] text-ink">{s.t}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-sm border border-line bg-elev px-6 py-10 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-mono text-2xl tracking-tight">Ready when you are.</h2>
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
