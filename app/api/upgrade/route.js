import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { USER_TABLE } from "@/config/schema";
import { getSessionUser, unauthorized } from "@/lib/auth";

// DEMO upgrade: flips isMember on the user. No payment gateway is wired in.
export async function POST() {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const existing = await db.select().from(USER_TABLE).where(eq(USER_TABLE.email, me.email));
    if (existing.length === 0) {
      await db.insert(USER_TABLE).values({ name: me.name, email: me.email, isMember: true });
    } else {
      await db.update(USER_TABLE).set({ isMember: true }).where(eq(USER_TABLE.email, me.email));
    }
    return NextResponse.json({ ok: true, isMember: true });
  } catch (error) {
    console.error("POST /api/upgrade:", error);
    return NextResponse.json({ error: "Upgrade failed" }, { status: 500 });
  }
}
