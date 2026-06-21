// Configures the settings for the express app object

import express, { Express } from "express";
import { userRouter } from "./routers/user.router.js";

const app: Express = express();

// Health check endpoint: To check if the server is running or not
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// If the route starts with /api/users, then the userRouter will handle the request
app.use("/api/users", userRouter);

export { app };
