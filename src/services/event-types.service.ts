import {
  CreateEventTypeDTO,
  UpdateEventTypeDTO,
} from "../dtos/event-type.dto.js";
import {
  create,
  findActiveByHostIdAndSlug,
  findByHostId,
  getById,
  getEventTypeWithHighestId,
  remove,
  slugExistsForHost,
  update,
} from "../repositories/event-type.repository.js";
import { getById as getUserById } from "../repositories/user.repository.js";
import { findActiveRulesByUser } from "../repositories/availability.repository.js";

import { conflict, forbidden, notFound } from "../utils/api-error.js";

import { startRegenerateHostSlotsWorkflow } from "../temporal/client.js";
import { normalizeToSlug } from "../utils/normalize.utils.js";
import { encodeBase62 } from "../utils/base62.js";

export async function listEventTypes(hostId: number) {
  const eventTypes = await findByHostId(hostId);
  return eventTypes;
}

async function createUniqueEventTypeSlug(userId: number, title: string) {
  const baseSlug = normalizeToSlug(title);

  const lastEventType = await getEventTypeWithHighestId();

  const nextId = (lastEventType?.id ?? 0) + 1;
  const hash = encodeBase62(nextId);

  return `${baseSlug}-${hash}`;
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

  let resolvedSlug = "";
  if (data.slug) {
    const isSlugTaken = await slugExistsForHost(hostId, data.slug);
    if (isSlugTaken) {
      throw conflict(
        "An event type with this slug already exists, please use a different slug",
      );
    }
    resolvedSlug = data.slug;
  }

  if (!resolvedSlug) {
    resolvedSlug = await createUniqueEventTypeSlug(hostId, data.title);
  }

  const eventType = create(hostId, { ...data, slug: resolvedSlug });

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

  const updatedEventType = update(id, data);

  // After updating the event type, trigger the Temporal workflow to regenerate host slots
  await startRegenerateHostSlotsWorkflow({ hostId });

  return updatedEventType;
}

export async function removeEventType(hostId: number, id: number) {
  const eventType = await getById(id);
  if (!eventType) {
    throw notFound("Event type not found");
  }

  if (eventType.hostId !== hostId) {
    throw forbidden("You are not authorized to delete this event type");
  }

  const removedEventType = remove(id);

  // After removing the event type, trigger the Temporal workflow to regenerate host slots
  await startRegenerateHostSlotsWorkflow({ hostId });

  return removedEventType;
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
