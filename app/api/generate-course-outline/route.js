import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/config/db";
import { STUDY_MATERIAL_TABLE, USER_TABLE } from "@/config/schema";
import { getSessionUser, unauthorized, FREE_COURSE_LIMIT } from "@/lib/auth";
import { generateOutline, generateAllNotes } from "@/lib/generators";
import { dispatchJob } from "@/lib/jobs";

export const maxDuration = 300;

const LEVELS = { easy: "Easy", moderate: "Moderate", hard: "Hard" };

export async function POST(req) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const body = await req.json();
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!topic) {
      return NextResponse.json({ error: "Please enter a topic." }, { status: 400 });
    }
    const studyType = typeof body.studyType === "string" && body.studyType ? body.studyType : "Content";
    const difficulty = LEVELS[String(body.difficultyLevel || "easy").toLowerCase()] || "Easy";

    // free plan credit check
    const [userRow] = await db.select().from(USER_TABLE).where(eq(USER_TABLE.email, me.email));
    if (!userRow?.isMember) {
      const existing = await db
        .select({ id: STUDY_MATERIAL_TABLE.id })
        .from(STUDY_MATERIAL_TABLE)
        .where(eq(STUDY_MATERIAL_TABLE.createdBy, me.email));
      if (existing.length >= FREE_COURSE_LIMIT) {
        return NextResponse.json(
          { error: `Free plan limit reached (${FREE_COURSE_LIMIT} courses). Upgrade to create more.` },
          { status: 403 }
        );
      }
    }

    const courseLayout = await generateOutline({ topic, studyType, difficulty });

    const courseId = uuidv4();
    await db.insert(STUDY_MATERIAL_TABLE).values({
      courseId,
      courseType: studyType,
      topic,
      difficultyLevel: difficulty,
      courseLayout,
      createdBy: me.email,
      status: "Generating",
    });

    // notes are generated in the background; dashboard polls the status
    await dispatchJob("notes.generate", { courseId }, () => generateAllNotes(courseId));

    return NextResponse.json({ courseId, status: "Generating", courseLayout }, { status: 200 });
  } catch (err) {
    console.error("POST /api/generate-course-outline:", err);
    return NextResponse.json({ error: err.message || "Failed to generate course" }, { status: 500 });
  }
}
