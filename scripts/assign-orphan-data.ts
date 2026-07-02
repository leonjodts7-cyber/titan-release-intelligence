/**
 * One-time script: assign orphan positions & alert_channels to the first auth user.
 * Usage: npx tsx scripts/assign-orphan-data.ts [user-email]
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const emailArg = process.argv[2];

  let userId: string | null = null;

  if (emailArg) {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === emailArg.toLowerCase());
    if (!user) {
      console.error(`No user found for email: ${emailArg}`);
      process.exit(1);
    }
    userId = user.id;
  } else {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1 });
    if (error) throw error;
    userId = data.users[0]?.id ?? null;
    if (!userId) {
      console.error("No auth users found. Create an account first.");
      process.exit(1);
    }
    console.log(`Using first user: ${data.users[0].email}`);
  }

  const { data: posRows, error: posErr } = await supabase
    .from("positions")
    .update({ user_id: userId })
    .is("user_id", null)
    .select("id");

  if (posErr) {
    console.error("positions update failed:", posErr.message);
    process.exit(1);
  }

  const { data: chRows, error: chErr } = await supabase
    .from("alert_channels")
    .update({ user_id: userId })
    .is("user_id", null)
    .select("id");

  if (chErr) {
    console.error("alert_channels update failed:", chErr.message);
    process.exit(1);
  }

  const posCount = posRows?.length ?? 0;
  const chCount = chRows?.length ?? 0;

  console.log(`Assigned ${posCount ?? 0} positions and ${chCount ?? 0} alert channels to user ${userId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
