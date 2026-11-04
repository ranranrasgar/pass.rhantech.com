// Seed Super Admin awal dari env (SEED_ADMIN_*). Aman dijalankan berulang:
// jika email sudah ada, user tidak diubah.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

async function main() {
  const name = process.env.SEED_ADMIN_NAME || "Super Admin";
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    throw new Error("Isi SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD (min. 8 karakter) di .env");
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super Admin ${email} sudah ada — dilewati.`);
    return;
  }
  await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role: "SUPER_ADMIN" },
  });
  console.log(`Super Admin ${email} dibuat.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
