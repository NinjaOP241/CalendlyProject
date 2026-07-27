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

export async function create(hostId: number, data: CreateEventTypeDTO) {
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

export async function findActiveByHostAndEventSlug() {}
