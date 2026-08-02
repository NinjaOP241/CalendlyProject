import { Connection, Client } from "@temporalio/client";
import { TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE } from "../config/env.js";

let client: Client | null = null;

// Singleton pattern to ensure only one instance of the Temporal client is created
export async function getTemporalClient() {
  // If the client has already been created, return it
  if (client) return client;

  // Create a new connection to the Temporal server
  const connection = await Connection.connect({
    address: TEMPORAL_ADDRESS,
  });

  // Create a new Temporal client using the connection
  client = new Client({
    connection,
    namespace: TEMPORAL_NAMESPACE,
  });

  return client;
}

export async function disconnectTemporal() {
  if (client) {
    await client.connection.close();
    client = null;
  }
}

export async function isTemporalHealthy(): Promise<boolean> {
  try {
    const connection = await Connection.connect({
      address: TEMPORAL_ADDRESS,
    });

    const health = await connection.healthService.check({});

    // gRPC Health Status Codes:
    // 0 -> UNKNOWN          : Health status could not be determined.
    // 1 -> SERVING          : Server is healthy and ready to serve requests.
    // 2 -> NOT_SERVING      : Server is running but not able to serve requests.
    // 3 -> SERVICE_UNKNOWN  : The requested service is not recognized.
    return health.status === 1;
  } catch {
    return false;
  }
}
