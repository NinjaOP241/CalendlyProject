import { Request, Response } from "express";
import {
  listEventTypes as listEventTypesService,
  getEventTypeById as getEventTypeByIdService,
  createEventType as createEventTypeService,
  updateEventType as updateEventTypeService,
  removeEventType as removeEventTypeService,
  getEventTypePublic as getEventTypePublicService,
} from "../services/event-types.service.js";

import { sendSuccess } from "../utils/api-response.js";

export async function listEventTypes(req: Request, res: Response) {
  const eventTypes = await listEventTypesService(req.userId);
  sendSuccess(res, eventTypes);
}

export async function getEventTypeById(req: Request, res: Response) {
  const { id } = req.params;
  const eventType = await getEventTypeByIdService(req.userId, Number(id));
  sendSuccess(res, eventType);
}

export async function createEventType(req: Request, res: Response) {
  const eventType = await createEventTypeService(req.userId, req.body);
  sendSuccess(res, eventType, 201, "Event type created successfully");
}

export async function updateEventType(req: Request, res: Response) {
  const { id } = req.params;
  const eventType = await updateEventTypeService(
    req.userId,
    Number(id),
    req.body,
  );
  sendSuccess(res, eventType, 200, "Event type updated successfully");
}

export async function removeEventType(req: Request, res: Response) {
  const { id } = req.params;
  await removeEventTypeService(req.userId, Number(id));
  sendSuccess(res, null, 200, "Event type removed successfully");
}

export async function getEventTypePublic(req: Request, res: Response) {
  const { hostId, eventSlug } = req.params;
  const eventType = await getEventTypePublicService(
    Number(hostId),
    String(eventSlug),
  );
  sendSuccess(res, eventType);
}
