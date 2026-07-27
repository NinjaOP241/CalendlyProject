import slug from "slug";
import { customAlphabet } from "nanoid";

const HASH_LENGTH = 12;
const LOWERCASE_ALPHANUMERIC = "abcdefghijklmnopqrstuvwxyz0123456789";

const generateHash = customAlphabet(LOWERCASE_ALPHANUMERIC, HASH_LENGTH);

/**
 * Ensures user-provided slugs are trimmed and formatted into clean URL strings.
 */
export function sanitizeSlug(input: string): string {
  return slug(input.trim(), { lower: true });
}

/**
 * Generates a URL-friendly slug from a title with an appended 12-char unique hash.
 * Example Output: "my-awesome-event-91c362f5b78f"
 */
export function generateUniqueSlug(title: string): string {
  const baseSlug = slug(title.trim(), { lower: true });
  const hash = generateHash();

  // Prevents leading hyphens if baseSlug evaluates to empty (e.g., title was "???")
  return baseSlug ? `${baseSlug}-${hash}` : hash;
}
