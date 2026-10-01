import { inngest } from "./client";

import { generateAllNotes, runStudyContentJob } from "@/lib/generators";

// Event: notes.generate -> data: { courseId }
export const GenerateNotes = inngest.createFunction(
	{
		id: "generate-course-notes",
		retries: 1,
		triggers: { event: "notes.generate" },
	},
	async ({ event, step }) => {
		const { courseId } = event.data;

		return step.run("generate-chapter-notes", () => generateAllNotes(courseId));
	},
);

// Event: studyType.content -> data: { recordId, courseId, type }
export const GenerateStudyTypeContent = inngest.createFunction(
	{
		id: "generate-study-type-content",
		retries: 1,
		triggers: { event: "studyType.content" },
	},
	async ({ event, step }) => {
		const { recordId, courseId, type } = event.data;

		return step.run("generate-content", () =>
			runStudyContentJob({ recordId, courseId, type }),
		);
	},
);
