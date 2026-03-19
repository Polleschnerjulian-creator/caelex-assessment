/**
 * DISCOS Live API Test Script
 * Run: npx tsx scripts/test-discos.ts
 */

const DISCOS_BASE_URL = "https://discosweb.esoc.esa.int/api";
const API_KEY = process.env.EU_DISCOS_API_KEY;

if (!API_KEY) {
  console.error("EU_DISCOS_API_KEY not set");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  Accept: "application/vnd.api+json",
  "DiscosWeb-Api-Version": "2",
};

async function fetchDISCOS(path: string, params?: Record<string, string>) {
  const url = new URL(`${DISCOS_BASE_URL}${path}`);
  if (params)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log("=== DISCOS Live API Integration Test ===\n");

  // Test 1: Fetch 5 payloads
  console.log("1. Fetching 5 Payload objects...");
  const payloads = await fetchDISCOS("/objects", {
    filter: "eq(objectClass,Payload)",
    "page[size]": "5",
    sort: "-satno",
  });
  for (const obj of payloads.data) {
    const a = obj.attributes;
    console.log(
      `   NORAD: ${a.satno ?? "N/A"} | COSPAR: ${a.cosparId ?? "N/A"} | ${a.name} | ${a.objectClass} | ${a.mass ?? "?"} kg`,
    );
  }
  console.log(`   ✓ ${payloads.data.length} objects returned\n`);

  // Test 2: ISS lookup
  console.log("2. Fetching ISS (NORAD 25544)...");
  const iss = await fetchDISCOS("/objects", {
    filter: "eq(satno,25544)",
    "page[size]": "1",
  });
  const issAttr = iss.data[0].attributes;
  console.log(`   Name: ${issAttr.name}`);
  console.log(`   COSPAR: ${issAttr.cosparId}`);
  console.log(`   Mass: ${issAttr.mass} kg`);
  console.log(`   Shape: ${issAttr.shape} | Span: ${issAttr.span}m`);
  console.log(`   Active: ${issAttr.active}`);
  console.log(`   ✓ ISS found\n`);

  // Test 3: Recent launches
  console.log("3. Fetching 3 recent launches...");
  const launches = await fetchDISCOS("/launches", {
    sort: "-epoch",
    "page[size]": "3",
  });
  for (const l of launches.data) {
    const a = l.attributes;
    console.log(
      `   ${a.cosparLaunchNo ?? "N/A"} | ${a.epoch?.slice(0, 10) ?? "N/A"} | Flight: ${a.flightNo ?? "N/A"} | Failed: ${a.failure}`,
    );
  }
  console.log(`   ✓ ${launches.data.length} launches returned\n`);

  // Test 4: Recent reentries
  console.log("4. Fetching 3 recent reentries...");
  const reentries = await fetchDISCOS("/reentries", {
    sort: "-epoch",
    "page[size]": "3",
  });
  for (const r of reentries.data) {
    console.log(`   ID: ${r.id} | Epoch: ${r.attributes.epoch}`);
  }
  console.log(`   ✓ ${reentries.data.length} reentries returned\n`);

  // Test 5: Search for Sentinel satellites
  console.log("5. Searching for 'Sentinel' satellites...");
  const sentinels = await fetchDISCOS("/objects", {
    filter: "contains(name,'Sentinel')",
    "page[size]": "5",
  });
  for (const obj of sentinels.data) {
    const a = obj.attributes;
    console.log(
      `   NORAD: ${a.satno ?? "N/A"} | ${a.name} | ${a.mass ?? "?"} kg | Active: ${a.active}`,
    );
  }
  console.log(`   ✓ ${sentinels.data.length} Sentinel satellites found\n`);

  console.log("=== All 5 tests passed ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
