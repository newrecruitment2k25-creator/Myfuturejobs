/**
 * Backfill candidate embeddings by calling the deployed worker API in batches of 10.
 * Run: node backfill-candidates.cjs
 */
const API_URL = "https://perkesoprax-ai.myfuturejobs.workers.dev/api/interview";
const ADMIN_SECRET = "perkeso-backfill-2025";
const BATCH_SIZE = 10;
const DELAY_MS = 1500; // stay well under rate limits

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runBatch() {
  const body = JSON.stringify({
    action: "backfill_candidate_embeddings",
    admin_secret: ADMIN_SECRET,
    limit: BATCH_SIZE,
  });

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }

  return await res.json();
}

async function main() {
  console.log("Starting candidate embedding backfill...\n");
  let totalUpdated = 0;
  let totalFailed = 0;
  let round = 1;

  while (true) {
    process.stdout.write(`Round ${round}... `);
    try {
      const result = await runBatch();
      const updated = result.updated ?? 0;
      const failed = result.failed ?? 0;
      const processed = result.processed ?? 0;
      totalUpdated += updated;
      totalFailed += failed;

      console.log(`processed=${processed} updated=${updated} failed=${failed} | total=${totalUpdated}`);

      if (result.errors?.length) {
        console.warn("  Errors:", result.errors.slice(0, 3).join("; "));
      }

      // If fewer than BATCH_SIZE were processed, we've reached the end
      if (processed < BATCH_SIZE) {
        console.log("\nAll candidates processed.");
        break;
      }

      round++;
      await sleep(DELAY_MS);
    } catch (err) {
      console.error(`\nBatch failed at round ${round}:`, err.message);
      console.log("Retrying in 5s...");
      await sleep(5000);
    }
  }

  console.log(`\nDone. Total updated: ${totalUpdated}, failed: ${totalFailed}`);
}

main().catch(console.error);
