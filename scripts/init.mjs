/**
 * One-time initialization script.
 * Run with:  node scripts/init.mjs
 * Requires DATABASE_URL set in environment (reads .env.local automatically via Next.js).
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const WRIKE_REFRESH_TOKEN =
  "eyJ0dCI6InAiLCJhbGciOiJIUzI1NiIsInR2IjoiMiJ9.eyJkIjoie1wiYVwiOjkzNzA4MyxcImlcIjo5Nzg0NzM0LFwiY1wiOjQ3MzM5NTQsXCJ2XCI6XCJcIixcInVcIjoxNDM0ODU0MyxcInJcIjpcIlVTXCIsXCJzXCI6W1wiTlwiXSxcInpcIjpbXCJyc2hcIl0sXCJ0XCI6MTc4NDc3ODczODAwMH0iLCJleHAiOjE3ODQ3Nzg3MzgsImlhdCI6MTc4MjE4NjczOH0.utZHSU7aBsIUIoFJFWR_FFvOf7-8ackzwVbz8qoFkm8";

const WRIKE_CLIENT_ID = process.env.WRIKE_CLIENT_ID;
const WRIKE_CLIENT_SECRET = process.env.WRIKE_CLIENT_SECRET;

const ADMIN_EMAIL = "skumari@vivarailings.com";
const ADMIN_NAME = "Sheshma Kumari";
const ADMIN_PASSWORD = "Viva@2026!"; // change after first login

const prisma = new PrismaClient();

async function hashPassword(password) {
  // Simple bcrypt-compatible hash via dynamic import
  const { default: bcrypt } = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

async function refreshWrikeToken() {
  console.log("🔄 Refreshing Wrike access token…");
  const res = await fetch("https://login.wrike.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: WRIKE_REFRESH_TOKEN,
      client_id: WRIKE_CLIENT_ID,
      client_secret: WRIKE_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error("Token refresh failed: " + JSON.stringify(data));
  }
  console.log("✅ Got fresh Wrike access token (expires in", data.expires_in, "s)");
  return data;
}

async function main() {
  console.log("\n=== Viva Dashboards — Init ===\n");

  // 1. Refresh Wrike token
  const token = await refreshWrikeToken();

  // 2. Upsert Wrike connection
  await prisma.appConnection.upsert({
    where: { id: "wrike" },
    create: {
      id: "wrike",
      app: "wrike",
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? WRIKE_REFRESH_TOKEN,
      expiresAt: BigInt(Date.now() + token.expires_in * 1000),
      host: token.host ?? "www.wrike.com",
    },
    update: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? WRIKE_REFRESH_TOKEN,
      expiresAt: BigInt(Date.now() + token.expires_in * 1000),
      host: token.host ?? "www.wrike.com",
    },
  });
  console.log("✅ Wrike connection saved to database");

  // 3. Create admin user
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log("ℹ️  Admin user already exists:", ADMIN_EMAIL);
  } else {
    const hashed = await hashPassword(ADMIN_PASSWORD);
    await prisma.user.create({
      data: { name: ADMIN_NAME, email: ADMIN_EMAIL, password: hashed, role: "ADMIN" },
    });
    console.log("✅ Admin user created:", ADMIN_EMAIL);
    console.log("   Temporary password:", ADMIN_PASSWORD);
    console.log("   ⚠️  Change this password after first login.");
  }

  console.log("\n🎉 Done! Go to http://localhost:3000/login and sign in.\n");
}

main()
  .catch((e) => { console.error("❌ Error:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
