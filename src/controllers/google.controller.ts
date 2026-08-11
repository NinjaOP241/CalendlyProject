import { Request, Response } from "express";
import { exchangeSetupCode } from "../services/google-calender.service.js";
import { badRequest } from "../utils/api-error.js";
import { sendSuccess } from "../utils/api-response.js";

export async function setupGoogleCallback(req: Request, res: Response) {
  const code = req.query.code as string | undefined;

  if (!code) {
    throw badRequest("No code provided");
  }

  const { refreshToken, email } = await exchangeSetupCode(code);

  sendSuccess(
    res,
    { refreshToken, email },
    200,
    "Google Calendar setup successful",
  );
}
