import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities/google-calendar.activities.js";

// Create a proxy for the activities to be used in the workflow
const { createGoogleCalendarEventActivity } = proxyActivities<
  typeof activities
>({
  retry: { maximumAttempts: 3 }, // Retry up to 3 times in case of failure
  startToCloseTimeout: "10 minutes", // Set a timeout for the activity execution
});

export async function createGoogleCalendarEventWorkflow(bookingId: number) {
  await createGoogleCalendarEventActivity(bookingId);
}
