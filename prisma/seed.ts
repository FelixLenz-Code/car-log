import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

// argon2id parameters — must match src/lib/auth/password.ts
const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Administrator";

  if (!email || !password) {
    console.log("[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed.");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] Admin '${email}' already exists — nothing to do.`);
    return;
  }

  const passwordHash = await hash(password, ARGON2_OPTS);
  await prisma.user.create({
    data: { email, name, passwordHash, role: "ADMIN" },
  });
  console.log(`[seed] Created admin user '${email}'.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
