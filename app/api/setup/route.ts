import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const existing = await prisma.user.count();
    if (existing > 0) {
      return NextResponse.json({ error: "Setup already complete. An admin account exists." }, { status: 409 });
    }

    const { name, email, password } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "name, email and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: "ADMIN" },
    });

    return NextResponse.json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    console.error("[Setup]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
