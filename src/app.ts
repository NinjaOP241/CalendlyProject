// Configures the settings for the express app object

import express, { Express } from "express";
import { userRouter } from "./routers/user.router.js";
import { errorHandler } from "./middlewares/error-handler.js";

const app: Express = express();

app.use(express.json()); // This will help to deserialize the JSON body of the request into a JavaScript object
app.use(express.text()); // This will help to deserialize the text body of the request into a JavaScript string
app.use(express.urlencoded()); // This will help to deserialize the urlencoded body of the request into a JavaScript object

// Health check endpoint: To check if the server is running or not
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// If the route starts with /api/users, then the userRouter will handle the request
app.use("/api/users", userRouter);

// At the last register our custom error handler
app.use(errorHandler);

export { app };
