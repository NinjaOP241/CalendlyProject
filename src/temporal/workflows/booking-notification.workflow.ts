import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities/booking-notification.activities.js";

// Create a proxy for the activities to be used in the workflow
const { sendBookingConfirmationEmailActivity } = proxyActivities<
  typeof activities
>({
  retry: { maximumAttempts: 3 }, // Retry up to 3 times in case of failure
  startToCloseTimeout: "10 minutes", // Set a timeout for the activity execution
});

/**
 * This Workflow function is executed by a Temporal Worker.
 *
 * Flow:
 * 1. Client starts the workflow using client.workflow.start(...)
 * 2. Temporal Server creates a Workflow Execution and schedules a Workflow Task.
 * 3. A Temporal Worker polls the Temporal Server, picks up the Workflow Task,
 *    and executes this Workflow function.
 * 4. When an Activity is called, Temporal Server schedules an Activity Task.
 * 5. A Temporal Worker picks up the Activity Task and executes the Activity function.
 */
export async function sendBookingConfirmationEmailWorkflow(bookingId: number) {
  await sendBookingConfirmationEmailActivity(bookingId);
}
