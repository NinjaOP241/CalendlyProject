import { prisma } from "../config/database.js";
import {
  CreateEventTypeDTO,
  UpdateEventTypeDTO,
} from "../dtos/event-type.dto.js";

export async function findByHostId(hostId: number) {
  const eventTypes = await prisma.eventType.findMany({
    where: {
      hostId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return eventTypes;
}

export async function getById(id: number) {
  const eventType = await prisma.eventType.findUnique({
    where: {
      id,
    },
  });
  return eventType;
}

/**
 * Persists a new EventType to the database.
 *
 * Issue: `CreateEventTypeDTO` leaves `slug` optional (`string | undefined`), but the
 * Prisma schema requires `slug` to be a non-nullable string.
 *
 * Fix: The type intersection `& { slug: string }` guarantees the service layer has
 * resolved any missing slugs before handing off the payload to the repository.
 */
export async function create(
  hostId: number,
  data: CreateEventTypeDTO & { slug: string },
) {
  const eventType = await prisma.eventType.create({
    data: {
      ...data,
      hostId,
    },
  });
  return eventType;
}

export async function update(id: number, data: UpdateEventTypeDTO) {
  const eventType = await prisma.eventType.update({
    where: { id },
    data,
  });
  return eventType;
}

export async function remove(id: number) {
  await prisma.eventType.delete({
    where: { id },
  });
}

export async function findByHostAndSlug(hostId: number, slug: string) {
  const eventType = await prisma.eventType.findFirst({
    where: {
      hostId,
      slug,
    },
  });
  return eventType;
}

export async function findActiveByHostIdAndSlug(hostId: number, slug: string) {
  const eventType = await prisma.eventType.findFirst({
    where: {
      hostId,
      slug,
      isActive: true,
    },
  });
  return eventType;
}

export async function slugExistsForHost(hostId: number, slug: string) {
  const existing = await prisma.eventType.findFirst({
    where: {
      hostId,
      slug,
    },
    select: { id: true }, // Returns only { id: ... } instead of the full row
  });

  return existing !== null;
}
