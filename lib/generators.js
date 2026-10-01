import { eq, and } from "drizzle-orm";
import { db } from "@/config/db";
import {
  STUDY_MATERIAL_TABLE,
  CHAPTER_NOTES_TABLE,
  STUDY_TYPE_CONTENT_TABLE,
} from "@/config/schema";
import { generateJSON } from "@/lib/ai";

const str = (v, fallback = "") => (typeof v === "string" && v.trim() ? v.trim() : fallback);
const arr = (v) => (Array.isArray(v) ? v : []);

/* ------------------------------------------------------------------ */
/* 1. COURSE OUTLINE                                                    */
/* ------------------------------------------------------------------ */
function normalizeOutline(raw, topic, difficulty) {
  const chaptersRaw = arr(raw.chapters || raw.Chapters);
  const chapters = chaptersRaw
    .map((c, i) => ({
      chapterTitle: str(c.chapterTitle || c.chapter_title || c.title, `Chapter ${i + 1}`),
      chapterSummary: str(c.chapterSummary || c.chapter_summary || c.summary),
      topics: arr(c.topics).map((t) => (typeof t === "string" ? t : str(t?.title || t?.name))).filter(Boolean),
      difficultyPriority: ["High", "Medium", "Low"].includes(c.difficultyPriority)
        ? c.difficultyPriority
        : i < 2 ? "High" : i < 4 ? "Medium" : "Low",
    }))
    .filter((c) => c.topics.length > 0 || c.chapterSummary);

  if (chapters.length === 0) throw new Error("AI returned an outline without chapters");

  return {
    courseTitle: str(raw.courseTitle || raw.course_title || raw.title, topic.slice(0, 80)),
    courseSummary: str(raw.courseSummary || raw.course_summary || raw.summary),
    difficulty,
    chapters,
  };
}

export async function generateOutline({ topic, studyType, difficulty }) {
  const prompt = `You are an expert teacher. Create a study course outline.

Purpose: ${studyType}
Difficulty level: ${difficulty}
Topic / source content: """${topic.slice(0, 6000)}"""

Return ONLY JSON with exactly this shape:
{
  "courseTitle": "short catchy title",
  "courseSummary": "2-3 sentence summary of the course",
  "chapters": [
    {
      "chapterTitle": "string",
      "chapterSummary": "2-3 sentence summary",
      "topics": ["topic 1", "topic 2", "topic 3", "topic 4"],
      "difficultyPriority": "High" | "Medium" | "Low"
    }
  ]
}
Rules: 5 to 7 chapters, each with 4 to 6 topics, ordered from basics to advanced.`;

  return generateJSON(prompt, { validate: (o) => normalizeOutline(o, topic, difficulty) });
}

/* ------------------------------------------------------------------ */
/* 2. CHAPTER NOTES                                                     */
/* ------------------------------------------------------------------ */
function normalizeNote(raw, chapter) {
  let topics = arr(raw.topics)
    .map((t) => ({
      topicTitle: str(t.topicTitle || t.title || t.topic),
      content: str(t.content || t.html || t.notes),
    }))
    .filter((t) => t.content);

  if (topics.length === 0 && str(raw.content)) {
    topics = [{ topicTitle: chapter.chapterTitle, content: str(raw.content) }];
  }
  if (topics.length === 0) throw new Error("AI returned empty notes");

  return {
    chapterTitle: str(raw.chapterTitle, chapter.chapterTitle),
    chapterSummary: str(raw.chapterSummary, chapter.chapterSummary),
    topics,
  };
}

export async function generateChapterNotes(chapter, difficulty = "Easy") {
  const prompt = `You are writing exam-oriented study notes for ONE chapter of a course.
Difficulty level: ${difficulty}
Chapter: ${JSON.stringify(chapter)}

Return ONLY JSON with exactly this shape:
{
  "chapterTitle": "string",
  "chapterSummary": "string",
  "topics": [
    { "topicTitle": "string", "content": "<h3>Topic title</h3><p>...</p>" }
  ]
}
Rules:
- One entry in "topics" for EVERY topic listed in the chapter.
- "content" is valid HTML only (h3, p, ul, li, strong, em, pre, code, table). No markdown, no <html>/<body> tags.
- Explain clearly, add short examples, and use <pre><code> blocks for code when relevant.
- Escape double quotes inside strings properly so the JSON stays valid.`;

  const note = await generateJSON(prompt, { validate: (o) => normalizeNote(o, chapter) });
  return JSON.stringify(note);
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { ok: true, value: await fn(items[i], i) };
      } catch (error) {
        results[i] = { ok: false, error };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

// Generates notes for every chapter, stores them in order, updates course status.
export async function generateAllNotes(courseId) {
  const [course] = await db
    .select()
    .from(STUDY_MATERIAL_TABLE)
    .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));
  if (!course) throw new Error(`Course ${courseId} not found`);

  const chapters = course.courseLayout?.chapters || [];
  if (chapters.length === 0) {
    await db.update(STUDY_MATERIAL_TABLE).set({ status: "Failed" }).where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));
    throw new Error("Course has no chapters");
  }

  await db.update(STUDY_MATERIAL_TABLE).set({ status: "Generating" }).where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

  const work = async (chapter) => generateChapterNotes(chapter, course.difficultyLevel || "Easy");
  let results = await mapWithConcurrency(chapters, 2, work);

  // one more pass for chapters that failed (rate limits etc.)
  const retryIdx = results.map((r, i) => (r.ok ? -1 : i)).filter((i) => i >= 0);
  if (retryIdx.length) {
    const retried = await mapWithConcurrency(retryIdx.map((i) => chapters[i]), 1, work);
    retried.forEach((r, k) => (results[retryIdx[k]] = r));
  }

  const okCount = results.filter((r) => r.ok).length;
  if (okCount === 0) {
    await db.update(STUDY_MATERIAL_TABLE).set({ status: "Failed" }).where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));
    throw new Error(results[0]?.error?.message || "Notes generation failed");
  }

  // replace old notes (idempotent) and keep chapter order
  await db.delete(CHAPTER_NOTES_TABLE).where(eq(CHAPTER_NOTES_TABLE.courseId, courseId));
  for (let i = 0; i < results.length; i++) {
    if (results[i].ok) {
      await db.insert(CHAPTER_NOTES_TABLE).values({
        courseId,
        chapterId: String(i),
        notes: results[i].value,
      });
    }
  }

  await db.update(STUDY_MATERIAL_TABLE).set({ status: "Ready" }).where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));
  return { chapters: chapters.length, generated: okCount };
}

/* ------------------------------------------------------------------ */
/* 3. FLASHCARDS / QUIZ / Q&A                                           */
/* ------------------------------------------------------------------ */
function courseContext(course) {
  const layout = course?.courseLayout || {};
  const chapters = arr(layout.chapters)
    .map((c, i) => `${i + 1}. ${c.chapterTitle}: ${arr(c.topics).join(", ")}`)
    .join("\n");
  return `Course: ${layout.courseTitle || course?.topic}\nDifficulty: ${course?.difficultyLevel || "Easy"}\nChapters and topics:\n${chapters}`;
}

function normalizeFlashcards(raw) {
  const cards = arr(raw.flashcards || raw.cards || (Array.isArray(raw) ? raw : []))
    .map((c) => ({ front: str(c.front || c.question || c.term), back: str(c.back || c.answer || c.definition) }))
    .filter((c) => c.front && c.back);
  if (cards.length < 3) throw new Error("AI returned too few flashcards");
  return { flashcards: cards };
}

function normalizeQuiz(raw) {
  const quiz = arr(raw.quiz || raw.questions || (Array.isArray(raw) ? raw : []))
    .map((q) => {
      const options = arr(q.options || q.choices).map((o) => str(String(o)));
      let answer = str(String(q.answer ?? q.correctAnswer ?? ""));
      // Make sure `answer` is exactly one of the options (the UI compares strings)
      if (!options.includes(answer)) {
        const letter = answer.match(/^\(?([A-D])\)?[.):\s]?/i);
        const byLetter = letter ? options[letter[1].toUpperCase().charCodeAt(0) - 65] : null;
        const byText = options.find((o) => o.toLowerCase() === answer.toLowerCase());
        answer = byText || byLetter || "";
      }
      return { question: str(q.question), options, answer };
    })
    .filter((q) => q.question && q.options.length >= 2 && q.answer);
  if (quiz.length < 3) throw new Error("AI returned too few quiz questions");
  return { quiz };
}

function normalizeQA(raw) {
  const qa = arr(raw.qa || raw.questions || (Array.isArray(raw) ? raw : []))
    .map((q) => ({ question: str(q.question), answer: str(q.answer) }))
    .filter((q) => q.question && q.answer);
  if (qa.length < 3) throw new Error("AI returned too few Q&A items");
  return { qa };
}

export async function generateStudyContent(type, course) {
  const ctx = courseContext(course);
  if (type === "Flashcard") {
    return generateJSON(
      `Create 15 flashcards covering the whole course for effective revision.\n${ctx}\n\nReturn ONLY JSON: {"flashcards":[{"front":"term or question","back":"short, clear answer"}]}`,
      { validate: normalizeFlashcards }
    );
  }
  if (type === "Quiz") {
    return generateJSON(
      `Create a 10 question multiple-choice quiz covering the whole course.\n${ctx}\n\nReturn ONLY JSON: {"quiz":[{"question":"...","options":["A text","B text","C text","D text"],"answer":"must be EXACTLY equal to one of the options"}]}\nEach question has exactly 4 options and only one correct answer.`,
      { validate: normalizeQuiz }
    );
  }
  if (type === "QA") {
    return generateJSON(
      `Create 10 important exam-style questions with complete model answers covering the whole course.\n${ctx}\n\nReturn ONLY JSON: {"qa":[{"question":"...","answer":"3-5 sentence answer"}]}`,
      { validate: normalizeQA }
    );
  }
  throw new Error(`Unknown study type: ${type}`);
}

// Runs the job for one STUDY_TYPE_CONTENT_TABLE row and stores the result.
export async function runStudyContentJob({ recordId, courseId, type }) {
  try {
    const [course] = await db.select().from(STUDY_MATERIAL_TABLE).where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));
    if (!course) throw new Error("Course not found");
    const content = await generateStudyContent(type, course);
    await db
      .update(STUDY_TYPE_CONTENT_TABLE)
      .set({ content, status: "Ready" })
      .where(eq(STUDY_TYPE_CONTENT_TABLE.id, recordId));
    return { recordId, status: "Ready" };
  } catch (error) {
    console.error(`[${type}] generation failed:`, error.message);
    await db
      .update(STUDY_TYPE_CONTENT_TABLE)
      .set({ status: "Failed" })
      .where(eq(STUDY_TYPE_CONTENT_TABLE.id, recordId));
    throw error;
  }
}

export async function getOwnedCourse(courseId, email) {
  const [course] = await db
    .select()
    .from(STUDY_MATERIAL_TABLE)
    .where(and(eq(STUDY_MATERIAL_TABLE.courseId, courseId), eq(STUDY_MATERIAL_TABLE.createdBy, email)));
  return course || null;
}
