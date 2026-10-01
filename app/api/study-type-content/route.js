import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/config/db";
import { STUDY_TYPE_CONTENT_TABLE, STUDY_MATERIAL_TABLE } from "@/config/schema";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { generateAllNotes, runStudyContentJob, getOwnedCourse } from "@/lib/generators";
import { dispatchJob } from "@/lib/jobs";

export const maxDuration = 300;

const TYPES = ["notes", "Flashcard", "Quiz", "QA"];

export async function POST(req) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const { courseId, type } = await req.json();
    if (!courseId || !TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid courseId or type" }, { status: 400 });
    }

    const course = await getOwnedCourse(courseId, me.email);
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    // (re)generate chapter notes
    if (type === "notes") {
      await db.update(STUDY_MATERIAL_TABLE).set({ status: "Generating" }).where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));
      await dispatchJob("notes.generate", { courseId }, () => generateAllNotes(courseId));
      return NextResponse.json({ message: "Notes generation started" }, { status: 201 });
    }

    // Flashcard / Quiz / QA: reuse the row if it exists, otherwise create one
    const rows = await db
      .select()
      .from(STUDY_TYPE_CONTENT_TABLE)
      .where(and(eq(STUDY_TYPE_CONTENT_TABLE.courseId, courseId), eq(STUDY_TYPE_CONTENT_TABLE.type, type)));

    let recordId;
    if (rows.length > 0) {
      recordId = rows[0].id;
      await db.update(STUDY_TYPE_CONTENT_TABLE).set({ status: "Generating" }).where(eq(STUDY_TYPE_CONTENT_TABLE.id, recordId));
    } else {
      const inserted = await db
        .insert(STUDY_TYPE_CONTENT_TABLE)
        .values({ courseId, type, status: "Generating" })
        .returning({ id: STUDY_TYPE_CONTENT_TABLE.id });
      recordId = inserted[0].id;
    }

    await dispatchJob("studyType.content", { recordId, courseId, type }, () =>
      runStudyContentJob({ recordId, courseId, type })
    );

    return NextResponse.json({ message: "Study content generation started", recordId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/study-type-content:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
