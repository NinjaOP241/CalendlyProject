import { PrismaClient } from "../../generated/prisma/client.js";
// Import the driver adapter for your specific database (example uses PostgreSQL)
import { PrismaPg } from "@prisma/adapter-pg";
import { DATABASE_URL } from "./env.js";

// Initialize the adapter according to your driver's requirements
const adapter = new PrismaPg({
  connectionString: DATABASE_URL,
});

// Pass the adapter instance to PrismaClient and create a new instance of PrismaClient
export const prisma = new PrismaClient({ adapter });

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log("[Database]: Connected Successfully");
  } catch (error) {
    console.error("[Database]: Error connecting to the database:", error);
    process.exit(1); // Exit the process with an error code
  }
}
