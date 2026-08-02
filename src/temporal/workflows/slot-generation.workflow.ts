import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities/index.js";
import { RegenerateHostSlotsInput } from "../../services/slot.service.js";

// Create a proxy for the activities to be used in the workflow
const { regenerateHostSlotsActivity } = proxyActivities<typeof activities>({
  retry: { maximumAttempts: 3 }, // Retry up to 3 times in case of failure
  startToCloseTimeout: "10 minutes", // Set a timeout for the activity execution
});

/**
 * regenerateHostSlotsWorkflow() is executed by a Temporal Worker after the workflow is
 * started by the client (client.workflow.start(...)) and the Temporal Server schedules
 * a Workflow Task for that workflow.
 */
export async function regenerateHostSlotsWorkflow(
  input: RegenerateHostSlotsInput,
) {
  await regenerateHostSlotsActivity(input); // Call the activity to regenerate host slots
}
