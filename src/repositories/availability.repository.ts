import { prisma } from "../config/database.js";
import {
  CreateAvailabilityRuleDTO,
  UpdateAvailabilityRuleDTO,
  CreateAvailabilityExceptionDTO,
  UpdateAvailabilityExceptionDTO,
} from "../dtos/availability.dto.js";
import { toUtcDate } from "../utils/date.util.js";

// ==========================================
// AVAILABILITY RULES
// ==========================================

export async function findRulesByUser(userId: number) {
  return prisma.availabilityRule.findMany({
    where: { userId },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });
}

export async function findActiveRulesByUser(userId: number) {
  return prisma.availabilityRule.findMany({
    where: { userId, isActive: true },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });
}

export async function findRuleById(id: number) {
  return prisma.availabilityRule.findUnique({
    where: { id },
  });
}

export async function createRule(
  userId: number,
  data: CreateAvailabilityRuleDTO,
) {
  return prisma.availabilityRule.create({
    data: { ...data, userId },
  });
}

export async function updateRule(id: number, data: UpdateAvailabilityRuleDTO) {
  return prisma.availabilityRule.update({
    where: { id },
    data,
  });
}

export async function deleteRule(id: number) {
  return prisma.availabilityRule.delete({
    where: { id },
  });
}

// ==========================================
// AVAILABILITY EXCEPTIONS
// ==========================================

export async function findExceptionsByUser(userId: number) {
  return prisma.availabilityException.findMany({
    where: { userId },
    orderBy: [{ date: "asc" }],
  });
}

export async function findExceptionById(id: number) {
  return prisma.availabilityException.findUnique({
    where: { id },
  });
}

export async function createException(
  userId: number,
  data: CreateAvailabilityExceptionDTO,
) {
  const { date, ...rest } = data;
  return prisma.availabilityException.create({
    data: {
      ...rest,
      userId,
      date: toUtcDate(date),
    },
  });
}

export async function updateException(
  id: number,
  data: UpdateAvailabilityExceptionDTO,
) {
  const { date, ...rest } = data;
  return prisma.availabilityException.update({
    where: { id },
    data: {
      ...rest,
      ...(date !== undefined && { date: toUtcDate(date) }),
    },
  });
}

export async function deleteException(id: number) {
  return prisma.availabilityException.delete({
    where: { id },
  });
}

export async function findExceptionsByUserInRange(
  userId: number,
  startDate: Date,
  endDate: Date,
) {
  return prisma.availabilityException.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
  });
}
