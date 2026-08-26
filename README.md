# elsewhere

Unified **token launchpad + AMM** on the [QIE](https://qie.digital) blockchain.

Launch a token on a bonding curve, graduate automatically at **$25,000** market cap, and swap assets from **official QIEdex pools** on QIE mainnet. Testnet is the active launchpad deployment; mainnet swap already talks to the live QIEdex factory/router.

The product name is **elsewhere**. The protocol still runs on QIE only (testnet chain `1983`, mainnet chain `1990`). Wallets connect through Reown AppKit (`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`).

## Live

- App: https://elsewhere-qie.netlify.app
- Docs: https://elsewhere-qie.netlify.app/docs
- GitHub: https://github.com/linoxbt/elsewhere
- In-app docs: [`/docs`](/docs)
- Testnet explorer: [testnet.qie.digital](https://testnet.qie.digital)
- Mainnet explorer: [mainnet.qie.digital](https://mainnet.qie.digital)
- Official faucet: [qie.digital/faucet](https://www.qie.digital/faucet) (2 QIE / 24h)

## What it does

| Route | Purpose |
| --- | --- |
| `/` | Landing |
| `/discover` | Discover launched tokens (new / market cap / volume / graduated) |
| `/create` | Deploy a token + bonding curve (image, ticker, socials, optional initial buy) |
| `/token/[address]` | Curve progress, price chart, buy/sell, trades, holders |
| `/swap` | Swap or DCA tokens listed from **official QIE pools** on the selected network |
| `/pools` | Add / remove liquidity, create pairs |
| `/lend` | Supply QIE, post collateral, borrow QIE |
| `/send` | Send a single token or batch to many recipients |
| `/docs` | Full protocol and contract reference |

Shared wallet (Reown AppKit: injected + WalletConnect QR), network switcher (testnet ↔ mainnet), live QIE/USD oracle on mainnet. Get testnet QIE from the [official faucet](https://www.qie.digital/faucet) — there's no in-app faucet button, only a docs link.

## Networks

### QIE Testnet, chain `1983`

| | |
| --- | --- |
| RPC | `https://rpc1testnet.qie.digital` |
| Explorer | https://testnet.qie.digital |
| Faucet | https://www.qie.digital/faucet |
| Launchpad | **deployed** (see contracts below) |
| Official DEX | none on this chain |

### QIE Mainnet, chain `1990`

| | |
| --- | --- |
| RPC | `https://rpc1mainnet.qie.digital` |
| Explorer | https://mainnet.qie.digital |
| Official DEX | [dex.qie.digital](https://www.dex.qie.digital) |
| Launchpad | not deployed yet. swap still uses official QIEdex |
| Oracle | official QIE/USD AggregatorV3 `0x3Bc617cF3A4Bb77003e4c556B87b13D556903D17` |

## Testnet contracts (deployed)

| Contract | Address |
| --- | --- |
| Launchpad factory | [`0xE02F1719Ce46EEbFFE450dB1f367012FaD4b43C2`](https://testnet.qie.digital/address/0xE02F1719Ce46EEbFFE450dB1f367012FaD4b43C2) |
| WQIE | [`0x76623AA01FE1784130E1B56FEcDb83C1E7b0E491`](https://testnet.qie.digital/address/0x76623AA01FE1784130E1B56FEcDb83C1E7b0E491) |
| AMM factory | [`0xc0E497c064163d455e8AEaD40795401d09Ac4B43`](https://testnet.qie.digital/address/0xc0E497c064163d455e8AEaD40795401d09Ac4B43) |
| AMM router | [`0xC348694650Fd0E2b51197425e4Ad88aEe11b5d48`](https://testnet.qie.digital/address/0xC348694650Fd0E2b51197425e4Ad88aEe11b5d48) |
| Fee router | [`0x998d51F77199A6a64837a648Ea9dB80F8F44607c`](https://testnet.qie.digital/address/0x998d51F77199A6a64837a648Ea9dB80F8F44607c) |
| Testnet QIE/USD feed | [`0x7F3635B76790cF57A955E6576504ef17564FE924`](https://testnet.qie.digital/address/0x7F3635B76790cF57A955E6576504ef17564FE924) |
| Lending pool | [`0x9fC086D60443362D49E2124D2dAF8c5814113918`](https://testnet.qie.digital/address/0x9fC086D60443362D49E2124D2dAF8c5814113918) |
| Batch sender | [`0x98530560C180f1a0701292eFfA46d08Cc0E2fBE4`](https://testnet.qie.digital/address/0x98530560C180f1a0701292eFfA46d08Cc0E2fBE4) |
| Money market | [`0xbE8B9Ae75BfA7FfDd79C4ae684f9DF18b7e8CBf9`](https://testnet.qie.digital/address/0xbE8B9Ae75BfA7FfDd79C4ae684f9DF18b7e8CBf9) |
| ELSE token | [`0x870505B6e86eA2e5910409751aB1F13186825E93`](https://testnet.qie.digital/address/0x870505B6e86eA2e5910409751aB1F13186825E93) |
| DCA | [`0xbE743B8c1B2dC68161F49b1a6Cc0Cd53C36BC23a`](https://testnet.qie.digital/address/0xbE743B8c1B2dC68161F49b1a6Cc0Cd53C36BC23a) |

Creation fee on testnet is **0.5 QIE** (feed set to $5 so the on-chain $2.50 fee is payable with a faucet drop). Graduation threshold remains **$25,000** USD market cap.

## Official QIEdex (mainnet)

Elsewhere does **not** replace QIEdex. Swap on mainnet reads these official contracts and lists every ERC-20 that appears in their pairs:

| | Address |
| --- | --- |
| Factory | `0xf297CC2e3A711fEeadf54a59a8162b71189E03d7` |
| Extra factory | `0xba33504bD33eF3731Cf8f59F755b289abb88F177` |
| Router | `0x2601a070A12749BC2ee095F17D9fbe904505C2dF` |
| WQIE | `0x0087904D95BEe9E5F24dc8852804b547981A9139` |

## Protocol

1. `LaunchpadFactory.createToken` deploys an ERC-20 (1B supply, 18 decimals) and a `BondingCurve`.
2. Buys/sells are constant-product against virtual + real WQIE reserves. Quote asset is native QIE (wrapped in-contract).
3. USD market cap = curve price × supply × live oracle (`OracleLib.readUsd8`). A stale or zero feed **reverts**.
4. At $25,000 mcap the curve graduates: remaining tokens + raised QIE seed an AMM pair at the current price; LP is locked.
5. Pre-graduation fee: **1%** (0.425% creator / 0.575% protocol).
6. Post-graduation AMM: **0.30% LP + 0.40% creator + 0.05% protocol**.

Solidity lives in [`contracts/`](./contracts). Tests:

```bash
cd contracts
forge test --no-match-contract LiveOracleFork -vv
# live mainnet oracle (fork)
forge test --match-contract LiveOracleFork --fork-url https://rpc1mainnet.qie.digital -vv
```

## App stack

- Next.js 15 (App Router) + TypeScript + Tailwind v4
- wagmi + viem + Reown AppKit (`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`): official Reown modal only
- Server indexer (`src/server/indexer.ts`) polls logs and serves `/api/tokens`, `/api/pools`, `/api/stats`
- Official pool token list: `GET /api/official-tokens?chainId=1990|1983`
- Manual reindex trigger (requires `Authorization: Bearer $INDEX_ADMIN_SECRET`): `POST /api/index` — also called on a schedule by `netlify/functions/scheduled-reindex.ts`, since the in-process poller in `instrumentation.ts` isn't guaranteed to run between separate serverless invocations.

## Run locally

```bash
git clone https://github.com/linoxbt/elsewhere.git
cd elsewhere
cp .env.example .env.local
npm install
npm run dev
```

App defaults to http://localhost:3003.

## Environment

Copy [`.env.example`](./.env.example). Only `NEXT_PUBLIC_*` values are required for the frontend.

**Never** put a deployer `PRIVATE_KEY` in Netlify, Vercel, or any `NEXT_PUBLIC_` variable.

| Variable | Role |
| --- | --- |
| `NEXT_PUBLIC_LAUNCHPAD_FACTORY` | Testnet factory |
| `NEXT_PUBLIC_WQIE` | Testnet wrapped QIE |
| `NEXT_PUBLIC_AMM_FACTORY` / `NEXT_PUBLIC_AMM_ROUTER` | Testnet AMM |
| `NEXT_PUBLIC_FEE_ROUTER` | Protocol fee sink |
| `NEXT_PUBLIC_QIE_USD_ORACLE` | Testnet AggregatorV3 feed |
| `NEXT_PUBLIC_MAINNET_*` | Optional, after a mainnet launchpad deploy |
| `PINATA_JWT` | Optional IPFS pin for token images |
| `INDEX_ADMIN_SECRET` | Bearer token required by `POST /api/index`. Unset = that endpoint is disabled. Set it in Netlify and it's used both by `netlify/functions/scheduled-reindex.ts` and for manual ops triggers. |

## Deploy contracts

```bash
cd contracts
PRIVATE_KEY=0x… forge script script/Deploy.s.sol:Deploy --rpc-url qie_testnet --broadcast
# mainnet
PRIVATE_KEY=0x… forge script script/Deploy.s.sol:Deploy --rpc-url qie --broadcast
```

On chain 1983 the script also deploys `TestnetPriceFeed`. On 1990 it binds the official QIE/USD oracle.

## Netlify

Production: https://elsewhere-qie.netlify.app

`netlify.toml` builds with `@netlify/plugin-nextjs`. Set the `NEXT_PUBLIC_*` values in the Netlify UI or via `netlify env:set`.

Deploys run from **GitHub Actions** (`.github/workflows/netlify.yml`) so Netlify does not clone the GitHub repo itself. Automatic Netlify git builds are stopped (`stop_builds`) because the build image hit `Host key verification failed` cloning GitHub without the GitHub App.

The on-disk indexer (`data/`) is ephemeral on serverless hosts. discover will refill after a cold start.

## Security notes

- No private keys are committed (`.deployer.key`, `.env.local`, Foundry broadcast cache are gitignored).
- Oracle reads revert if the feed is stale (>48h) or non-positive.
- Creation fee and graduation threshold live in `src/lib/config.ts` and the Solidity constants so they can be updated in one place.

## License

MIT
