import { hash, verify } from "@node-rs/argon2";

// argon2id parameters — keep in sync with prisma/seed.ts
const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTS);
}

export function verifyPassword(
  passwordHash: string,
  password: string
): Promise<boolean> {
  return verify(passwordHash, password, ARGON2_OPTS);
}
