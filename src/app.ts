// Configures the settings for the express app object

import express, { Express } from "express";

const app: Express = express();

// Health check endpoint: To check if the server is running or not
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export { app };
