import { after } from "next/server";
import { inngest } from "@/app/inngest/client";

// Background job dispatcher.
//  - USE_INNGEST=true  -> sends the event to Inngest (needs Inngest keys / dev server)
//  - otherwise (default) -> runs the job right after the response, in-process (no extra server)
export function dispatchJob(eventName, data, runner) {
  if (process.env.USE_INNGEST === "true") {
    return inngest.send({ name: eventName, data });
  }
  after(async () => {
    try {
      await runner();
    } catch (err) {
      console.error(`[job:${eventName}] failed:`, err.message);
    }
  });
  return Promise.resolve();
}
