import { serve } from "inngest/next";
import { inngest } from "../../inngest/client";
import { GenerateNotes, GenerateStudyTypeContent } from "@/app/inngest/functions";

export const { GET, POST } = serve({
    client: inngest,
    functions: [GenerateNotes, GenerateStudyTypeContent],
});