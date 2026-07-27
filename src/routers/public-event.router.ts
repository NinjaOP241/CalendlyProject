import { Router } from "express";
import { getEventTypePublic } from "../controllers/event-type.controller.js";

export const publicEventRouter: Router = Router();

publicEventRouter.get("/users/:userId/event-types/:slug", getEventTypePublic);
