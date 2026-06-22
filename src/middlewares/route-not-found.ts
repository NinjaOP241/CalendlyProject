import { Request, Response, NextFunction } from "express";
import { notFound } from "../utils/api-error.js";

// This is a normal regular middleware function
export const routeNotFound = (
  _req: Request,
  _res: Response,
  next: NextFunction,
) => {
  // Pass the error to the next middleware which is our custom error handler
  next(notFound("Route not found"));
};
