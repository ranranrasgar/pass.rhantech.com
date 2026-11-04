// Reset database uji + buat admin E2E sebelum seluruh tes.
import bcrypt from "bcryptjs";
import pg from "pg";
import { E2E_ADMIN, TEST_DB } from "./env";

export default async function globalSetup() {
  const db = new pg.Client({ connectionString: TEST_DB });
  await db.connect();
  await db.query(
    "TRUNCATE audit_logs, check_ins, scan_logs, qr_credentials, guests, import_batches, gate_assignments, gates, events, users, print_presets RESTART IDENTITY CASCADE",
  );
  await db.query(
    "INSERT INTO users (name, email, password_hash, role, is_active, updated_at) VALUES ($1, $2, $3, 'SUPER_ADMIN', true, now())",
    [E2E_ADMIN.name, E2E_ADMIN.email, await bcrypt.hash(E2E_ADMIN.password, 10)],
  );
  await db.end();
}
