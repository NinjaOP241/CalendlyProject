import { Request, Response } from "express";
import {
  exchangeSetupCode,
  getSetupAuthUrl,
} from "../services/google-calender.service.js";
import { badRequest, internalServerError } from "../utils/api-error.js";
import { sendSuccess } from "../utils/api-response.js";

export async function getAuthUrlController(req: Request, res: Response) {
  const authUrl = getSetupAuthUrl(req.userId);

  if (!authUrl) {
    throw internalServerError("Failed to generate auth url");
  }

  sendSuccess(res, authUrl, 200, "Auth Url Generated successfully");
}

export async function setupGoogleCallback(req: Request, res: Response) {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;

  if (!code || !state) {
    throw badRequest("Missing authorization code or state");
  }

  const userId = Number(state);

  const { refreshToken, email } = await exchangeSetupCode(code, userId);

  sendSuccess(
    res,
    { refreshToken, email },
    200,
    "Google Calendar setup successful",
  );
}
