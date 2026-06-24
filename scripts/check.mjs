import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const users = await p.user.findMany({ select: { email: true, name: true, role: true, active: true } });
const conns = await p.appConnection.findMany({ select: { app: true, host: true, expiresAt: true } });
console.log("Users:", JSON.stringify(users, null, 2));
console.log("Connections:", conns.map(c => ({ app: c.app, host: c.host, expiresAt: new Date(Number(c.expiresAt)).toISOString() })));
await p.$disconnect();
