# shrine protocol (QIE mainnet)

Uniswap-v2-style AMM + pump.fun-style bonding-curve launchpad. Quoted in wrapped native QIE.

```
PRIVATE_KEY=0x… forge script script/Deploy.s.sol:Deploy --rpc-url qie --broadcast
```

Then set the printed addresses as `NEXT_PUBLIC_*` in the app `.env.local`.

Tests: `forge test -vv`
