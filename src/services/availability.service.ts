import {
  CreateAvailabilityExceptionDTO,
  CreateAvailabilityRuleDTO,
  UpdateAvailabilityExceptionDTO,
  UpdateAvailabilityRuleDTO,
} from "../dtos/availability.dto.js";
import {
  findRulesByUser,
  findRuleById,
  findExceptionsByUser,
  findExceptionById,
  createRule as createRuleRepo,
  updateRule as updateRuleRepo,
  deleteRule as deleteRuleRepo,
  createException as createExceptionRepo,
  updateException as updateExceptionRepo,
  deleteException as deleteExceptionRepo,
} from "../repositories/availability.repository.js";
import { forbidden, notFound } from "../utils/api-error.js";

// ==========================================
// AVAILABILITY RULES
// ==========================================

export async function listRules(userId: number) {
  return findRulesByUser(userId);
}

export async function createRule(
  userId: number,
  data: CreateAvailabilityRuleDTO,
) {
  return createRuleRepo(userId, data);
}

export async function updateRule(
  userId: number,
  ruleId: number,
  data: UpdateAvailabilityRuleDTO,
) {
  const rule = await findRuleById(ruleId);
  if (!rule) {
    throw notFound("Availability rule not found");
  }

  if (rule.userId !== userId) {
    throw forbidden("You are not authorized to update this availability rule");
  }

  return updateRuleRepo(ruleId, data);
}

export async function deleteRule(userId: number, ruleId: number) {
  const rule = await findRuleById(ruleId);
  if (!rule) {
    throw notFound("Availability rule not found");
  }

  if (rule.userId !== userId) {
    throw forbidden("You are not authorized to delete this availability rule");
  }

  return deleteRuleRepo(ruleId);
}

// ==========================================
// AVAILABILITY EXCEPTIONS
// ==========================================

export async function listExceptions(userId: number) {
  return findExceptionsByUser(userId);
}

export async function createException(
  userId: number,
  data: CreateAvailabilityExceptionDTO,
) {
  return createExceptionRepo(userId, data);
}

export async function updateException(
  userId: number,
  exceptionId: number,
  data: UpdateAvailabilityExceptionDTO,
) {
  const exception = await findExceptionById(exceptionId);

  if (!exception) {
    throw notFound("Availability exception not found");
  }

  if (exception.userId !== userId) {
    throw forbidden(
      "You are not authorized to update this availability exception",
    );
  }

  return updateExceptionRepo(exceptionId, data);
}

export async function deleteException(userId: number, exceptionId: number) {
  const exception = await findExceptionById(exceptionId);
  if (!exception) {
    throw notFound("Availability exception not found");
  }

  if (exception.userId !== userId) {
    throw forbidden(
      "You are not authorized to delete this availability exception",
    );
  }

  return deleteExceptionRepo(exceptionId);
}
