import slug from "slug";

/**
 * Normalizes a name or text into a handle format.
 * Rule: Lowercase, strip spaces/invalid symbols, retain letters/numbers, periods, underscores, and hyphens.
 * Example: "José Miller!" → "josemiller"
 */
export function normalizeToHandle(input: string): string {
  // 1. Transliterate accents (José -> jose) and remove spaces
  const base = slug(input, {
    replacement: "", // Removes spaces entirely instead of adding hyphens
    lower: true,
  });

  // 2. Strip out remaining punctuation/emojis, keeping only allowed chars
  return base.replace(/[^a-z0-9._-]/g, "");
}

/**
 * Converts a title into a URL slug format.
 * Rule: Lowercase, replace spaces with hyphens, strip invalid characters.
 * Example: "30 Min Café Call!" -> "30-min-cafe-call"
 */
export function normalizeToSlug(title: string): string {
  // 1. Transliterate accents and replace spaces with hyphens
  const base = slug(title, {
    replacement: "-",
    lower: true,
  });

  // 2. Strip invalid characters, collapse multiple hyphens, and trim
  return base
    .replace(/[^a-z0-9-]/g, "") // Keep only alphanumeric and hyphens
    .replace(/-+/g, "-") // Collapse consecutive hyphens ("---" -> "-")
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
}
