import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "docs · elsewhere",
  description: "Elsewhere protocol, networks, contracts, and app guide",
};

const TESTNET = {
  factory: "0xE02F1719Ce46EEbFFE450dB1f367012FaD4b43C2",
  wqie: "0x76623AA01FE1784130E1B56FEcDb83C1E7b0E491",
  ammFactory: "0xc0E497c064163d455e8AEaD40795401d09Ac4B43",
  ammRouter: "0xC348694650Fd0E2b51197425e4Ad88aEe11b5d48",
  feeRouter: "0x998d51F77199A6a64837a648Ea9dB80F8F44607c",
  oracle: "0x7F3635B76790cF57A955E6576504ef17564FE924",
};

const MAINNET_DEX = {
  factory: "0xf297CC2e3A711fEeadf54a59a8162b71189E03d7",
  extraFactory: "0xba33504bD33eF3731Cf8f59F755b289abb88F177",
  router: "0x2601a070A12749BC2ee095F17D9fbe904505C2dF",
  wqie: "0x0087904D95BEe9E5F24dc8852804b547981A9139",
  oracle: "0x3Bc617cF3A4Bb77003e4c556B87b13D556903D17",
};

export default function DocsPage() {
  return (
    <article className="prose-invert mx-auto max-w-3xl space-y-10 font-mono text-[13px] leading-relaxed text-muted">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-widest text-faint">elsewhere / documentation</p>
        <h1 className="text-3xl tracking-tight text-ink">docs</h1>
        <p>
          Elsewhere is a unified token launchpad and AMM on the QIE blockchain. Launch on a bonding
          curve, graduate at $25,000 market cap, and swap against official QIEdex pools on mainnet.
          Testnet is live first; mainnet launchpad deploy is a later step.
        </p>
      </header>

      <Section id="quickstart" title="quickstart">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Open the app and select <strong className="text-ink">testnet</strong> in the nav switcher.
          </li>
          <li>
            Tap <strong className="text-ink">+ testnet</strong> to add QIE Testnet (chain 1983) to
            MetaMask / Rabby / QIE Wallet.
          </li>
          <li>
            Connect a wallet. The button opens Reown AppKit (injected browsers plus
            WalletConnect QR) using <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code>.
          </li>
          <li>
            Request test QIE via <strong className="text-ink">faucet</strong> (official drop is 2 QIE /
            24h at{" "}
            <a className="text-accent" href="https://www.qie.digital/faucet">
              qie.digital/faucet
            </a>
            ).
          </li>
          <li>
            Create a token on <Link className="text-accent" href="/create">/create</Link> (0.5 QIE
            creation fee on testnet) or swap official mainnet pools on{" "}
            <Link className="text-accent" href="/swap">/swap</Link>.
          </li>
        </ol>
      </Section>

      <Section id="networks" title="networks">
        <Table
          rows={[
            ["", "testnet", "mainnet"],
            ["name", "QIE Testnet", "QIE Mainnet"],
            ["chain id", "1983 (0x7bf)", "1990 (0x7c6)"],
            ["symbol", "QIE", "QIE"],
            ["rpc", "rpc1testnet.qie.digital", "rpc1mainnet.qie.digital"],
            ["explorer", "testnet.qie.digital", "mainnet.qie.digital"],
            ["faucet", "qie.digital/faucet", "—"],
            ["launchpad", "deployed", "not deployed yet"],
            ["official dex", "none on this chain", "QIEdex (dex.qie.digital)"],
          ]}
        />
        <p className="mt-3">
          The nav switcher persists your choice and calls <code>wallet_addEthereumChain</code> /
          <code>wallet_switchEthereumChain</code> so the wallet follows the app.
        </p>
      </Section>

      <Section id="product" title="product surface">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <Link className="text-accent" href="/">
              discover
            </Link>{" "}
            — launched tokens, sort by new / market cap / volume / graduated, live poll.
          </li>
          <li>
            <Link className="text-accent" href="/create">
              create
            </Link>{" "}
            — image, name, ticker, socials, optional initial buy. Fee is priced on-chain from the
            oracle ($2.50 target).
          </li>
          <li>
            <Link className="text-accent" href="/swap">
              swap
            </Link>{" "}
            — token list is fetched from official QIEdex factories on the selected network. Mainnet
            routes through the official router.
          </li>
          <li>
            <Link className="text-accent" href="/pools">
              pools
            </Link>{" "}
            — add / remove liquidity and create pairs on the Elsewhere AMM (testnet deploy).
          </li>
          <li>
            <code>/token/[address]</code> — bonding-curve progress, chart, buy/sell, trades, holders.
            The panel switches to AMM mode on graduation without a reload.
          </li>
        </ul>
      </Section>

      <Section id="protocol" title="protocol">
        <p>
          Tokens are standard 18-decimal ERC-20s with 1,000,000,000 supply. They start on a
          constant-product bonding curve quoted in WQIE / native QIE. Virtual reserves seed a low
          initial market cap. When USD market cap (oracle × curve price × supply) reaches{" "}
          <strong className="text-ink">$25,000</strong>, leftover tokens and raised QIE are seeded
          into an AMM pair at the current price and LP is locked.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>creation fee: $2.50 in native QIE (testnet feed set so this is 0.5 QIE)</li>
          <li>bonding-curve fee: 1.000% — 0.425% creator / 0.575% protocol</li>
          <li>AMM fee: 0.30% LP + 0.40% creator (launchpad tokens) + 0.05% protocol</li>
        </ul>
      </Section>

      <Section id="oracle" title="oracle">
        <p>
          Mainnet uses the official QIE AggregatorV3 feed{" "}
          <code className="text-ink">{MAINNET_DEX.oracle}</code> (QIE/USD, 8 decimals). The factory
          and bonding curve read it on-chain via <code>OracleLib</code> — stale or non-positive
          answers revert. There is no official feed on testnet, so deploy ships a{" "}
          <code>TestnetPriceFeed</code> with the same ABI.
        </p>
      </Section>

      <Section id="contracts-testnet" title="testnet contracts (1983)">
        <AddrTable
          explorer="https://testnet.qie.digital"
          rows={[
            ["Launchpad factory", TESTNET.factory],
            ["WQIE", TESTNET.wqie],
            ["AMM factory", TESTNET.ammFactory],
            ["AMM router", TESTNET.ammRouter],
            ["Fee router", TESTNET.feeRouter],
            ["Testnet QIE/USD feed", TESTNET.oracle],
          ]}
        />
      </Section>

      <Section id="contracts-mainnet" title="official QIEdex (mainnet 1990)">
        <p>Swap on mainnet reads these official pools. Elsewhere did not deploy them.</p>
        <AddrTable
          explorer="https://mainnet.qie.digital"
          rows={[
            ["QIEdex factory", MAINNET_DEX.factory],
            ["Secondary factory", MAINNET_DEX.extraFactory],
            ["QIEdex router", MAINNET_DEX.router],
            ["WQIE", MAINNET_DEX.wqie],
            ["QIE/USD oracle", MAINNET_DEX.oracle],
          ]}
        />
      </Section>

      <Section id="wallet" title="wallet">
        <p>
          Connect opens Reown AppKit. Injected browsers (MetaMask, Rabby, QIE Wallet) and
          WalletConnect QR both use <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code>.
        </p>
      </Section>

      <Section id="indexer" title="indexer">
        <p>
          A Node indexer polls factory, curve, pair, and ERC-20 logs and writes aggregates
          (market cap, 24h volume, holders, candles) under <code>data/</code>. The UI reads{" "}
          <code>/api/tokens</code>, <code>/api/pools</code>, <code>/api/stats</code> — it does not
          scan the chain in the browser. On Netlify the filesystem is ephemeral, so discover may
          start empty after a cold start and refill as the function indexes again.
        </p>
      </Section>

      <Section id="run" title="run locally">
        <pre className="overflow-x-auto rounded-sm border border-line bg-elev p-3 text-[12px] text-ink">{`git clone <this-repo>
cd elsewhere
cp .env.example .env.local
npm install
npm run dev`}</pre>
        <p className="mt-3">Contracts (Foundry):</p>
        <pre className="overflow-x-auto rounded-sm border border-line bg-elev p-3 text-[12px] text-ink">{`cd contracts
forge test --no-match-contract LiveOracleFork -vv
PRIVATE_KEY=0x… forge script script/Deploy.s.sol:Deploy --rpc-url qie_testnet --broadcast`}</pre>
      </Section>

      <Section id="env" title="environment">
        <p>
          Only <code>NEXT_PUBLIC_*</code> values are needed to run the app. Never put a deployer
          private key in Netlify or the browser bundle.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <code>NEXT_PUBLIC_LAUNCHPAD_FACTORY</code> / <code>WQIE</code> / <code>AMM_*</code> /{" "}
            <code>FEE_ROUTER</code> / <code>QIE_USD_ORACLE</code> — testnet launchpad
          </li>
          <li>
            <code>NEXT_PUBLIC_MAINNET_*</code> — optional, after a mainnet launchpad deploy
          </li>
          <li>
            <code>PINATA_JWT</code> — optional IPFS pin for token images
          </li>
        </ul>
      </Section>
    </article>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-lg text-ink">
        <a href={`#${id}`} className="hover:text-accent">
          {title}
        </a>
      </h2>
      {children}
    </section>
  );
}

function Table({ rows }: { rows: string[][] }) {
  const [head, ...body] = rows;
  return (
    <div className="overflow-x-auto rounded-sm border border-line">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="text-faint">
            {head.map((c) => (
              <th key={c || "k"} className="px-3 py-2 font-normal">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r) => (
            <tr key={r[0]} className="border-t border-line">
              {r.map((c, i) => (
                <td key={i} className={`px-3 py-2 ${i === 0 ? "text-faint" : "text-ink"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddrTable({
  explorer,
  rows,
}: {
  explorer: string;
  rows: [string, string][];
}) {
  return (
    <div className="overflow-x-auto rounded-sm border border-line">
      <table className="w-full text-left text-[12px]">
        <tbody>
          {rows.map(([k, addr]) => (
            <tr key={addr} className="border-t border-line first:border-0">
              <td className="px-3 py-2 text-faint">{k}</td>
              <td className="px-3 py-2">
                <a
                  className="break-all text-accent"
                  href={`${explorer}/address/${addr}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {addr}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
