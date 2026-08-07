import { TASK_QUEUES } from "../config/env.js";
import { getTemporalClient, isTemporalHealthy } from "../config/temporal.js";
import { RegenerateHostSlotsInput } from "../services/slot.service.js";

async function startWorkflow(
  workflowName: string,
  workflowId: string,
  args: unknown[],
  taskQueue: string,
) {
  // Check if Temporal is healthy before attempting to start the workflow
  if (!isTemporalHealthy()) {
    console.warn(
      "[temporal] Temporal is not enabled, skipping the workflow start",
    );
    return null;
  }

  try {
    /**
     * Suppose at the time of health check, temporal was healthy.
     * And before we could get the client the temporal server went down.
     * In that case, we want to avoid waiting indefinitely for the client to connect.
     *
     * We will use Promise.race to set a timeout for the client connection.
     * If the connection takes longer than 5 seconds, we will reject the promise and log an error.
     */
    const client = await Promise.race([
      getTemporalClient(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Temporal client connection timeout")),
          5000,
        ),
      ),
    ]);

    // Start the workflow with the provided name, ID, and arguments
    const handle = await client.workflow.start(workflowName, {
      taskQueue,
      workflowId,
      args,
    });

    return handle.workflowId;
  } catch (err) {
    console.error(
      `[temporal] Error starting workflow ${workflowName} with id ${workflowId}, error: ${err}`,
    );
    return null;
  }
}

/**
 * Starts the regenerateHostSlotsWorkflow execution in Temporal.
 *
 * This function is called by the application service layer when host slots
 * need to be regenerated. It sends a workflow start request to the Temporal
 * server, which schedules the workflow task on the configured task queue.
 */
export async function startRegenerateHostSlotsWorkflow(
  input: RegenerateHostSlotsInput,
) {
  return await startWorkflow(
    "regenerateHostSlotsWorkflow",
    `regenerate-host-slots-${input.hostId}-${Date.now()}`,
    [input],
    TASK_QUEUES.SLOT_GENERATION,
  );
}

export async function startSendBookingConfirmationEmailWorkflow(
  bookingId: number,
) {
  return await startWorkflow(
    "sendBookingConfirmationEmailWorkflow",
    `send-booking-confirmation-email-${bookingId}-${Date.now()}`,
    [bookingId],
    TASK_QUEUES.NOTIFICATIONS,
  );
}
