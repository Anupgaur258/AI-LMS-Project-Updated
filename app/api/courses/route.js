import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/config/db";
import { STUDY_MATERIAL_TABLE } from "@/config/schema";
import { getSessionUser, unauthorized } from "@/lib/auth";

// POST -> list of the signed-in user's courses (identity comes from Clerk, not the request body)
export async function POST() {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const result = await db
      .select()
      .from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.createdBy, me.email))
      .orderBy(desc(STUDY_MATERIAL_TABLE.id));

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("POST /api/courses:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET ?courseId=... -> single course (only if it belongs to the user)
export async function GET(req) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const courseId = new URL(req.url).searchParams.get("courseId");
    if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });

    const course = await db
      .select()
      .from(STUDY_MATERIAL_TABLE)
      .where(and(eq(STUDY_MATERIAL_TABLE.courseId, courseId), eq(STUDY_MATERIAL_TABLE.createdBy, me.email)));

    return NextResponse.json({ result: course[0] || null }, { status: 200 });
  } catch (error) {
    console.error("GET /api/courses:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
