import { prisma } from "../config/database.js";
import type { Prisma } from "../../generated/prisma/client.js";

/**
 * Represents the transactional client type provided by Prisma during an interactive transaction.
 * Used by repositories to ensure data operations execute within an active transaction boundary.
 */
export type TransactionClient = Prisma.TransactionClient;

/**
 * A flexible database client type that can accept either the global Prisma instance
 * or an active transaction-scoped client (`tx`).
 *
 * ARCHITECTURAL BENEFIT: This allows repository functions to be completely agnostic
 * of whether they are being called normally or inside a transaction block.
 */
export type DbClient = typeof prisma | TransactionClient;

/**
 * Resolves and returns the appropriate database client.
 *
 * @param db - Optional transaction client passed down from the service layer
 * @returns The active database client (`tx` if provided, otherwise the global singleton `prisma`)
 */
export function getDbClient(db?: DbClient) {
  return db ?? prisma;
}

/**
 * Transaction Runner (Unit of Work Pattern Abstraction)
 * Executes a series of database operations atomically inside a transaction.
 *
 * ARCHITECTURAL BENEFIT:
 * By wrapping `prisma.$transaction` inside this helper, the service layer remains
 * 100% decoupled from Prisma-specific transaction syntax. If we ever migrate from
 * Prisma to another ORM or raw SQL, we only need to rewrite this single function.
 *
 * @template T - The return type of the transactional block
 * @param callback - An async function containing repository operations, receiving the `tx` client
 * @returns The resolved data returned by the transaction callback
 */
export async function runInTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(callback);
}
