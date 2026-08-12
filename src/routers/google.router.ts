import { Router } from "express";
import {
  getAuthUrlController,
  setupGoogleCallback,
} from "../controllers/google.controller.js";
import { requireUserId } from "../middlewares/require-user-id.js";

export const googleIntegrationRouter: Router = Router();

googleIntegrationRouter.get("/setup", requireUserId, getAuthUrlController);
googleIntegrationRouter.get("/callback", setupGoogleCallback);
