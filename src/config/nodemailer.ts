import nodemailer from "nodemailer";
import {
  EMAIL_FROM,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
} from "./env.js";

let transporter: nodemailer.Transporter | null = null;

// Singleton pattern to ensure only one instance of the transporter client is created
function getTransporter() {
  // If the client has already been created, return it
  if (transporter) return transporter;

  // Check if SMTP credentials are provided
  const hasCredentials = Boolean(SMTP_USER && SMTP_PASS);

  // Create a new transporter client using the connection
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,

    /**
     * secure: true  -> Establish a TLS-encrypted connection immediately (typically port 465).
     *
     * secure: false -> Start with a plain TCP connection; if the SMTP server supports STARTTLS,
     * upgrade the connection to TLS after connecting (typically port 587, or port 1025
     * for MailHog without TLS).
     */
    secure: SMTP_SECURE,
    auth: hasCredentials
      ? {
          user: SMTP_USER,
          pass: SMTP_PASS,
        }
      : undefined, // If no credentials are provided, set auth to undefined
  });

  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html,
  });

  console.log(`[nodemailer] Email sent to ${to} with subject ${subject}`);
}
