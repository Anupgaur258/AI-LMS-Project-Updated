import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { USER_TABLE, STUDY_MATERIAL_TABLE } from "@/config/schema";
import { getSessionUser, unauthorized, FREE_COURSE_LIMIT } from "@/lib/auth";

// GET -> membership + course count (read only)
export async function GET() {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const [row] = await db.select().from(USER_TABLE).where(eq(USER_TABLE.email, me.email));
    const courses = await db
      .select({ id: STUDY_MATERIAL_TABLE.id })
      .from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.createdBy, me.email));

    return NextResponse.json({
      isMember: !!row?.isMember,
      courseCount: courses.length,
      limit: FREE_COURSE_LIMIT,
    });
  } catch (error) {
    console.error("GET /api/user:", error);
    return NextResponse.json({ error: "Could not load user" }, { status: 500 });
  }
}

// POST -> make sure the Clerk user exists in our users table
export async function POST() {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const existing = await db.select().from(USER_TABLE).where(eq(USER_TABLE.email, me.email));
    if (existing.length === 0) {
      await db.insert(USER_TABLE).values({ name: me.name, email: me.email });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/user:", error);
    return NextResponse.json({ error: "Could not save user" }, { status: 500 });
  }
}
