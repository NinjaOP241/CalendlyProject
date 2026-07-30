import { Request, Response } from "express";

import {
  listRules as listRulesService,
  createRule as createRuleService,
  updateRule as updateRuleService,
  deleteRule as deleteRuleService,
  listExceptions as listExceptionsService,
  createException as createExceptionService,
  updateException as updateExceptionService,
  deleteException as deleteExceptionService,
} from "../services/availability.service.js";

import { sendSuccess } from "../utils/api-response.js";

// ==========================================
// AVAILABILITY RULES
// ==========================================

export async function listRules(req: Request, res: Response) {
  const rules = await listRulesService(req.userId);
  sendSuccess(res, rules);
}

export async function createRule(req: Request, res: Response) {
  const rule = await createRuleService(req.userId, req.body);
  sendSuccess(res, rule, 201, "Availability rule created successfully");
}

export async function updateRule(req: Request, res: Response) {
  const { id } = req.params;
  const rule = await updateRuleService(req.userId, Number(id), req.body);
  sendSuccess(res, rule, 200, "Availability rule updated successfully");
}

export async function deleteRule(req: Request, res: Response) {
  const { id } = req.params;
  await deleteRuleService(req.userId, Number(id));
  sendSuccess(res, null, 200, "Availability rule deleted successfully");
}

// ==========================================
// AVAILABILITY EXCEPTIONS
// ==========================================

export async function listExceptions(req: Request, res: Response) {
  const exceptions = await listExceptionsService(req.userId);
  sendSuccess(res, exceptions);
}

export async function createException(req: Request, res: Response) {
  const exception = await createExceptionService(req.userId, req.body);
  sendSuccess(
    res,
    exception,
    201,
    "Availability exception created successfully",
  );
}

export async function updateException(req: Request, res: Response) {
  const { id } = req.params;
  const exception = await updateExceptionService(
    req.userId,
    Number(id),
    req.body,
  );
  sendSuccess(
    res,
    exception,
    200,
    "Availability exception updated successfully",
  );
}

export async function deleteException(req: Request, res: Response) {
  const { id } = req.params;
  await deleteExceptionService(req.userId, Number(id));
  sendSuccess(res, null, 200, "Availability exception deleted successfully");
}
