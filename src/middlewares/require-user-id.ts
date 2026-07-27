import { Request, Response, NextFunction } from "express";
import { badRequest } from "../utils/api-error.js";

export function requireUserId(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const userIdHeader = req.headers["x-user-id"];

  if (
    !userIdHeader ||
    Array.isArray(userIdHeader) ||
    typeof userIdHeader !== "string"
  ) {
    throw badRequest("x-user-id header is required");
  }

  const userId = Number(userIdHeader);

  if (Number.isNaN(userId) || userId <= 0) {
    throw badRequest("Invalid x-user-id header");
  }

  req.userId = userId;

  return next();
}
