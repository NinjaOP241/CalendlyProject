import {
  CreateEventTypeDTO,
  UpdateEventTypeDTO,
} from "../dtos/event-type.dto.js";
import {
  create,
  findActiveByHostIdAndSlug,
  findByHostId,
  getById,
  remove,
  slugExistsForHost,
  update,
} from "../repositories/event-type.repository.js";
import { getById as getUserById } from "../repositories/user.repository.js";
import { findActiveRulesByUser } from "../repositories/availability.repository.js";

import { conflict, forbidden, notFound } from "../utils/api-error.js";
import { generateUniqueSlug, sanitizeSlug } from "../utils/slug.utils.js";

import { startRegenerateHostSlotsWorkflow } from "../temporal/client.js";

export async function listEventTypes(hostId: number) {
  const eventTypes = await findByHostId(hostId);
  return eventTypes;
}

export async function createEventType(
  hostId: number,
  data: CreateEventTypeDTO,
) {
  // Ensure the host has at least one active availability rule before creating an event type
  const availabilityRules = await findActiveRulesByUser(hostId);

  if (availabilityRules.length === 0) {
    throw conflict(
      "Please create availability rules before creating an event type",
    );
  }

  // Clean custom slug if provided; otherwise generate a title-based slug + hash
  const resolvedSlug = data.slug?.trim()
    ? sanitizeSlug(data.slug)
    : generateUniqueSlug(data.title);

  if (!resolvedSlug) {
    throw conflict("Could not generate a slug for the event type");
  }

  const isSlugTaken = await slugExistsForHost(hostId, resolvedSlug);

  if (isSlugTaken) {
    throw conflict(
      "An event type with this slug already exists, please use a different slug",
    );
  }

  const eventType = await create(hostId, { ...data, slug: resolvedSlug });

  // After creating the event type, trigger the Temporal workflow to regenerate host slots
  await startRegenerateHostSlotsWorkflow({ hostId });

  return eventType;
}

export async function updateEventType(
  hostId: number,
  id: number,
  data: UpdateEventTypeDTO,
) {
  const eventType = await getById(id);
  if (!eventType) {
    throw notFound("Event type not found");
  }

  if (eventType.hostId !== hostId) {
    throw forbidden("You are not authorized to update this event type");
  }

  if (data.slug && data.slug !== eventType.slug) {
    const isSlugTaken = await slugExistsForHost(hostId, data.slug);
    if (isSlugTaken) {
      throw conflict(
        "An event type with this slug already exists, please use a different slug",
      );
    }
  }

  return update(id, data);
}

export async function removeEventType(hostId: number, id: number) {
  const eventType = await getById(id);
  if (!eventType) {
    throw notFound("Event type not found");
  }

  if (eventType.hostId !== hostId) {
    throw forbidden("You are not authorized to delete this event type");
  }
  return await remove(id);
}

/**
 * Retrieves an event type by its ID for a specific host.
 *
 * @access Private / Authenticated (Host Only)
 * @throws {NotFoundError} If no event type exists with the given ID.
 * @throws {ForbiddenError} If the event type does not belong to the requesting host.
 */
export async function getEventTypeById(hostId: number, id: number) {
  const eventType = await getById(id);
  if (!eventType) {
    throw notFound("Event type not found");
  }
  if (eventType.hostId !== hostId) {
    throw forbidden("You are not authorized to view this event type");
  }
  return eventType;
}

/**
 * Publicly retrieves an active event type and its host's public profile info by slug.
 * Used for guest booking pages.
 *
 * @access Public
 * @throws {NotFoundError} If the event type is inactive, doesn't exist, or the host is not found.
 */
export async function getEventTypePublic(hostId: number, eventSlug: string) {
  const eventType = await findActiveByHostIdAndSlug(hostId, eventSlug);
  if (!eventType) {
    throw notFound("Event type not found");
  }

  const host = await getUserById(hostId);
  if (!host) {
    throw notFound("Host not found");
  }

  return {
    eventType: {
      id: eventType.id,
      title: eventType.title,
      description: eventType.description,
      durationMinutes: eventType.durationMinutes,
      locationType: eventType.locationType,
    },
    host: {
      name: host.name,
      email: host.email,
    },
  };
}
