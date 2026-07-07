/**
 * Creates test accounts in the new Supabase project via Admin API.
 * Run: node create-test-accounts.cjs
 * Requires SUPABASE_SERVICE_ROLE_KEY in environment or hardcoded below.
 */

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://irqwetayrcfugtqyrmvz.supabase.co";
// Loaded from env; pass as: $env:SUPABASE_SERVICE_ROLE_KEY="..." node create-test-accounts.cjs
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("ERROR: Set SUPABASE_SERVICE_ROLE_KEY env var before running.");
  process.exit(1);
}

const ACCOUNTS = [
  { email: "jobseeker@test.myfuturejobs.my", password: "Test@1234", role: "job_seeker",  label: "Job Seeker" },
  { email: "employer@test.myfuturejobs.my",  password: "Test@1234", role: "employer",    label: "Employer" },
  { email: "admin@test.myfuturejobs.my",     password: "Test@1234", role: "admin",       label: "Admin" },
  { email: "caseworker@test.myfuturejobs.my",password: "Test@1234", role: "caseworker",  label: "Caseworker" },
];

async function createUser({ email, password, role, label }) {
  // 1. Create auth user (email confirm skipped — admin API auto-confirms)
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { role },
    }),
  });

  const createData = await createRes.json();

  if (!createRes.ok) {
    // If user already exists, fetch their ID
    if (createData.msg?.includes("already") || createData.message?.includes("already")) {
      console.log(`  [SKIP] ${label} (${email}) already exists`);
      return null;
    }
    throw new Error(`Create failed for ${email}: ${JSON.stringify(createData)}`);
  }

  const userId = createData.id;
  console.log(`  [OK] Created ${label} (${email}) — id: ${userId}`);

  // 2. Upsert profile row
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify({ id: userId, role }),
  });

  if (!profileRes.ok) {
    const txt = await profileRes.text();
    console.warn(`  [WARN] Profile upsert failed for ${email}: ${txt}`);
  } else {
    console.log(`  [OK] Profile set to role="${role}" for ${email}`);
  }

  return { email, password, role, userId };
}

async function main() {
  console.log("Creating test accounts...\n");
  const results = [];

  for (const account of ACCOUNTS) {
    try {
      const r = await createUser(account);
      if (r) results.push(r);
    } catch (e) {
      console.error(`  [ERROR] ${account.label}: ${e.message}`);
    }
  }

  console.log("\n═══════════════════════════════════════");
  console.log("  TEST ACCOUNT CREDENTIALS");
  console.log("═══════════════════════════════════════");
  for (const a of ACCOUNTS) {
    console.log(`\n  ${a.label.toUpperCase()}`);
    console.log(`  Email   : ${a.email}`);
    console.log(`  Password: ${a.password}`);
    console.log(`  Role    : ${a.role}`);
  }
  console.log("\n  Login URL : https://perkesoprax-ai.myfuturejobs.workers.dev/login");
  console.log("  Employer  : https://perkesoprax-ai.myfuturejobs.workers.dev/employer/login");
  console.log("  Admin     : https://perkesoprax-ai.myfuturejobs.workers.dev/admin/login");
  console.log("═══════════════════════════════════════\n");
}

main().catch(console.error);
