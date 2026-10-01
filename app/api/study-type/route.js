import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/config/db";
import { CHAPTER_NOTES_TABLE, STUDY_TYPE_CONTENT_TABLE } from "@/config/schema";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { getOwnedCourse } from "@/lib/generators";

export async function POST(req) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const { courseId, studyType } = await req.json();
    if (!courseId || !studyType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const course = await getOwnedCourse(courseId, me.email);
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const getNotes = () =>
      db
        .select()
        .from(CHAPTER_NOTES_TABLE)
        .where(eq(CHAPTER_NOTES_TABLE.courseId, courseId))
        .orderBy(asc(CHAPTER_NOTES_TABLE.id));

    if (studyType === "ALL") {
      const notes = await getNotes();
      const contentList = await db
        .select()
        .from(STUDY_TYPE_CONTENT_TABLE)
        .where(eq(STUDY_TYPE_CONTENT_TABLE.courseId, courseId));

      const pick = (t) => contentList.find((item) => item.type === t) || null;
      return NextResponse.json({
        notes,
        flashcard: pick("Flashcard"),
        quiz: pick("Quiz"),
        qa: pick("QA"),
        courseStatus: course.status,
      });
    }

    if (studyType === "notes") {
      return NextResponse.json({ notes: await getNotes(), courseStatus: course.status });
    }

    const notes = await db
      .select()
      .from(STUDY_TYPE_CONTENT_TABLE)
      .where(and(eq(STUDY_TYPE_CONTENT_TABLE.courseId, courseId), eq(STUDY_TYPE_CONTENT_TABLE.type, studyType)));

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("POST /api/study-type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
