import "dotenv/config";

export const PORT = process.env.PORT || 3000;
export const DATABASE_URL = process.env.DATABASE_URL || "";
export const NODE_ENV = process.env.NODE_ENV || "development";
export const SLOT_GENERATION_DAYS =
  Number(process.env.SLOT_GENERATION_DAYS) || 30;
