import { app } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { PORT } from "./config/env.js";

export async function startServer() {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`[server]: Running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  // app.listen can throw an error if the port is already in use
  console.error("[server]: Failed to start", err);
  process.exit(1); // Exit the process with an error code
});
