import { Router } from "express";

import { requireUserId } from "../middlewares/require-user-id.js";
import {
  createEventType,
  getEventTypeById,
  listEventTypes,
  removeEventType,
  updateEventType,
} from "../controllers/event-type.controller.js";

import { createEventTypeSchema } from "../dtos/event-type.dto.js";
import { validate } from "../middlewares/validate.js";

export const eventTypeRouter: Router = Router();

eventTypeRouter.use(requireUserId);

eventTypeRouter.get("/", listEventTypes);
eventTypeRouter.get("/:id", getEventTypeById);
eventTypeRouter.post("/", validate(createEventTypeSchema), createEventType);
eventTypeRouter.patch("/:id", validate(createEventTypeSchema), updateEventType);
eventTypeRouter.delete("/:id", removeEventType);
