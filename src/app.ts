// Configures the settings for the express app object

import express, { Express } from "express";
import { userRouter } from "./routers/user.router.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { routeNotFound } from "./middlewares/route-not-found.js";

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

/**
 * The order of middlewares is important in Express.
 * Express executes middleware from top to bottom.
 *
 * - routeNotFound middleware should be the second last middleware
 * - errorHandler middleware should be the last middleware
 */
// If the request is not handled by any of the above routes, then the routeNotFound middleware will handle the request
app.use(routeNotFound);

// At the last register our custom error handler
app.use(errorHandler);

export { app };
