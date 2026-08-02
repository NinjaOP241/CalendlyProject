import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities/index.js";
import {
  TEMPORAL_ADDRESS,
  TEMPORAL_NAMESPACE,
  TEMPORAL_TASK_QUEUE,
} from "../config/env.js";
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
    taskQueue: TEMPORAL_TASK_QUEUE,
    activities: activities,
    workflowsPath: fileURLToPath(
      new URL("./workflows/index.ts", import.meta.url),
    ), // Path to the compiled workflows file
  });

  console.log(
    `[temporal] Worker started, listening to task queue: ${TEMPORAL_TASK_QUEUE}`,
  );
  await worker.run(); // Start the worker to listen for tasks
}

run().catch((err) => {
  console.error("[temporal] Worker failed to start", err);
  process.exit(1); // Exit the process with an error code if the worker fails to start
});
