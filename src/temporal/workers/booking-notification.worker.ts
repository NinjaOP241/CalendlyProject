import { NativeConnection, Worker } from "@temporalio/worker";
import * as notificationActivities from "../activities/booking-notification.activities.js";
import {
  TEMPORAL_ADDRESS,
  TEMPORAL_NAMESPACE,
  TASK_QUEUES,
} from "../../config/env.js";
import { fileURLToPath } from "url";

async function run() {
  /**
   * The workers will run as a separate process.
   * Hence, we need to establish a connection to the Temporal server in this process as well.
   */
  const connection = await NativeConnection.connect({
    address: TEMPORAL_ADDRESS,
  });

  // Create a worker that will listen to the specified task queue and execute workflows and activities
  const worker = await Worker.create({
    connection,
    namespace: TEMPORAL_NAMESPACE,
    taskQueue: TASK_QUEUES.NOTIFICATIONS,
    activities: notificationActivities,
    workflowsPath: fileURLToPath(
      new URL("../workflows/booking-notification.workflow.ts", import.meta.url),
    ),
  });

  console.log(
    `[temporal] Notification Worker listening on: ${TASK_QUEUES.NOTIFICATIONS}`,
  );
  await worker.run(); // Start the worker to listen for tasks
}

run().catch((err) => {
  console.error("[temporal] Notification Worker failed to start", err);
  process.exit(1); // Exit the process with an error code if the worker fails to start
});
