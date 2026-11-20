/**
 * Awareness Memory on T3N — seal a durable memory into a tenant KV map.
 *
 * Flow:
 *   1. authenticate as the T3N tenant (key from the claim page)
 *   2. create a private `awareness-memory` map (owner-only; no contract yet)
 *   3. read a real memory from the local Awareness daemon
 *   4. write it into the T3N map and read it back
 *
 * The key is read from T3N_API_KEY and never written to disk.
 */
import {
  T3nClient,
  TenantClient,
  setEnvironment,
  loadWasmComponent,
  resolveTrustAnchor,
  eth_get_address,
  metamask_sign,
  createEthAuthInput,
  getNodeUrl,
} from "@terminal3/t3n-sdk";

const T3N_API_KEY = process.env.T3N_API_KEY;
if (!T3N_API_KEY) throw new Error("T3N_API_KEY is required");
const AWARENESS_URL = (process.env.AWARENESS_LOCAL_URL || "http://127.0.0.1:37800").replace(/\/+$/, "");
const TAIL = "awareness-memory";

setEnvironment("testnet");
const wasmComponent = await loadWasmComponent();
const address = eth_get_address(T3N_API_KEY);
const t3n = new T3nClient({
  trustAnchor: await resolveTrustAnchor("testnet"),
  wasmComponent,
  handlers: { EthSign: metamask_sign(address, undefined, T3N_API_KEY) },
});

await t3n.handshake();
const did = await t3n.authenticate(createEthAuthInput(address));
const tenantDid = did.value;
console.log("tenant:", tenantDid);

const tenant = new TenantClient({ t3n, baseUrl: getNodeUrl(), tenantDid });
await tenant.tenant.me();
console.log("TenantClient ready");

// Owner-only map: no contract can read it yet; a TEE contract would be added
// to readers/writers once registered.
const acl = { readers: { only: [] as string[] }, writers: { only: [] as string[] } };
try {
  await tenant.maps.create({ tail: TAIL, visibility: "private", ...acl });
  console.log(`map created: ${tenant.canonicalName(TAIL)}`);
} catch (err) {
  const msg = String((err as Error)?.message || err);
  if (/already exists/i.test(msg)) {
    await tenant.maps.update(TAIL, acl);
    console.log(`map exists; ACL refreshed: ${tenant.canonicalName(TAIL)}`);
  } else {
    throw err;
  }
}

const res = await fetch(`${AWARENESS_URL}/api/v1/memories/search?q=storage&limit=3`);
if (!res.ok) throw new Error(`Awareness search failed: HTTP ${res.status}`);
const payload = await res.json();
const items = (payload.items || []).slice(0, 3);
if (!items.length) throw new Error("no Awareness memory found; run the OpenMinion demo first");

for (const item of items) {
  const key = `memory:${item.id}`;
  const value = JSON.stringify({
    title: item.title,
    summary: item.summary,
    created_at: item.created_at,
    source: "awareness",
  });
  await tenant.maps.entrySet(TAIL, key, value);
  console.log(`sealed ${key} (${value.length} bytes)`);
}

const first = items[0];
const readBack = await tenant.maps.entryGet(TAIL, `memory:${first.id}`);
console.log("read back:", (readBack || "").slice(0, 240));
console.log("done: Awareness memory is now in the tenant's private T3N map.");
