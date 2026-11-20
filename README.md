# Awareness Memory on T3N

> Terminal 3 Build + Scale Agent Micro Grant — a working integration between
> **Awareness** (durable agent memory) and **T3N** (confidential tenant storage).

AI agents remember too much in plaintext and forget everything when the process
ends. This project does the opposite: it reads a real memory from Awareness and
**seals it into a private T3N tenant KV map**, where access is controlled by the
tenant and (next step) by a TEE contract's ACL — not by the agent.

```
Awareness (durable memory)
        │  read a research memory
        ▼
T3N tenant  z:<tid>:awareness-memory
        │  owner/contract-only ACL
        ▼
read-back proof  ──▶  the agent never sees the enclave internals
```

**Demo video:** https://github.com/everest-an/awareness-t3-memory/raw/main/demo/t3-demo.mp4

## What it demonstrates

1. **Authenticated T3N session** — Ethereum-signed login, tenant DID read from
   the network (never derived locally).
2. **Private tenant map** — `z:<tid>:awareness-memory` with an owner-only ACL;
   a TEE contract is added to readers/writers once registered.
3. **Real Awareness data** — reads a real memory from the local Awareness daemon.
4. **Seal + read back** — writes the memory with `maps.entrySet` and proves it
   with `maps.entryGet`.

No raw memory is ever printed to a public endpoint in this demo; the map is
private and the key is never committed.

## Quick start

```bash
# 1) T3N developer key from https://www.terminal3.io/claim-page
export T3N_API_KEY="0x..."          # shown once; never commit it

# 2) local Awareness daemon (zero account)
npx @awareness.market/local start   # http://127.0.0.1:37800

# 3) install + run
npm install
npx tsx demo.ts
```

Expected output:

```
tenant: did:t3n:...
TenantClient ready
map created: z:<tid>:awareness-memory
sealed memory:...
read back: {"title":"Research: storage and sync decisions",...}
done: Awareness memory is now in the tenant's private T3N map.
```

### Web demo

```bash
T3N_API_KEY=0x... npm start
# → http://127.0.0.1:37803
```

## Design notes

- **Map ACL**: `readers`/`writers` restrict *contracts*, not the owner. The owner
  can always write via the control plane; a TEE contract is added to the ACL
  after registration. This demo keeps the map owner-only.
- **Why not store the memory in the agent?** The agent is the least trusted
  component. T3N keeps the memory encrypted at rest and lets a contract act on
  it without exporting the raw value.
- **Next step**: register a TEE contract, add its `contract_id` to the map ACL,
  and expose one read function (`memory_get`) to a delegated org agent.

## Security

- The T3N key is read from `T3N_API_KEY`; it is never written to the repo, the
  page, or the output.
- The map is `private`; do not put PII in a `public:` map.
- The demo prints memory metadata to the local terminal only.

## Hackathon fit (Terminal 3 Build + Scale)

- **Trusted agent + private data**: the sensitive part (memory) lives in T3N,
  not in the model context or a third-party vector DB.
- **Existing product, new integration**: Awareness is the memory layer; T3N is
  the confidential storage/permission layer.
- **Adoption path**: teams already using Awareness can opt into T3N storage per
  memory; no architecture rewrite.

## License

MIT
