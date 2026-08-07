import "dotenv/config";

export const PORT = process.env.PORT || 3000;
export const DATABASE_URL = process.env.DATABASE_URL || "";
export const NODE_ENV = process.env.NODE_ENV || "development";
export const SLOT_GENERATION_DAYS =
  Number(process.env.SLOT_GENERATION_DAYS) || 30;

export const TEMPORAL_ADDRESS =
  process.env.TEMPORAL_ADDRESS || "localhost:7233";
export const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE || "default";
export const TASK_QUEUES = {
  SLOT_GENERATION:
    process.env.TEMPORAL_SLOT_TASK_QUEUE || "calendly.slots.generation",
  NOTIFICATIONS:
    process.env.TEMPORAL_NOTIFICATION_TASK_QUEUE ||
    "calendly.notifications.email",
} as const;

export const SMTP_HOST = process.env.SMTP_HOST || "localhost";
export const SMTP_PORT = Number(process.env.SMTP_PORT) || 1025;
export const SMTP_USER = process.env.SMTP_USER || "";
export const SMTP_PASS = process.env.SMTP_PASS || "";
export const SMTP_SECURE = process.env.SMTP_SECURE === "true";
export const EMAIL_FROM =
  process.env.SMTP_FROM || "Calendly <noreply@example.com>";
