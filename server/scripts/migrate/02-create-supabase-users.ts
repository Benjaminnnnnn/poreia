/**
 * Creates Supabase Auth users from the Firebase export.
 * Produces a uid-mapping.json: { [firebaseUid]: supabaseUuid }
 *
 * How sign-in works after migration:
 *   Users are pre-created with their email (confirmed). When they sign in
 *   with Google, Supabase matches by email and links the Google identity
 *   to the existing account — no duplicate accounts, no password required.
 *   Requires "Allow linking existing accounts" enabled in Supabase Auth settings.
 *
 * Usage: npx tsx scripts/migrate/02-create-supabase-users.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface FirebaseUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

async function main() {
  const firebaseUsers: FirebaseUser[] = JSON.parse(
    readFileSync("scripts/migrate/data/firebase-users.json", "utf-8"),
  );

  const mapping: Record<string, string> = {};
  const errors: { uid: string; email: string; error: string }[] = [];

  console.log(`Creating ${firebaseUsers.length} Supabase users...\n`);

  for (const [i, user] of firebaseUsers.entries()) {
    process.stdout.write(`\r  ${i + 1}/${firebaseUsers.length}: ${user.email}`);

    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true,          // skip confirmation email — already verified via Firebase
      user_metadata: {
        full_name: user.displayName,
        avatar_url: user.photoURL,
        firebase_uid: user.uid,     // stored for traceability, not used at runtime
      },
    });

    if (error) {
      // User already exists (re-run safety)
      if (error.message.includes("already been registered")) {
        const { data: existing } = await supabase.auth.admin.listUsers();
        const match = existing?.users.find((u) => u.email === user.email);
        if (match) {
          mapping[user.uid] = match.id;
          continue;
        }
      }
      errors.push({ uid: user.uid, email: user.email, error: error.message });
      continue;
    }

    mapping[user.uid] = data.user.id;
  }

  console.log("\n");

  writeFileSync("scripts/migrate/data/uid-mapping.json", JSON.stringify(mapping, null, 2));
  console.log(`✓ Mapped ${Object.keys(mapping).length}/${firebaseUsers.length} users`);

  if (errors.length > 0) {
    writeFileSync("scripts/migrate/data/user-errors.json", JSON.stringify(errors, null, 2));
    console.warn(`⚠ ${errors.length} users failed — see data/user-errors.json`);
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
