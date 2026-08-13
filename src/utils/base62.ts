const BASE62_CHARSET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Encodes a non-negative integer into a Base62 string.
 * Example: 1000 -> "g8"
 */
export function encodeBase62(num: number): string {
  if (num === 0) return "0";
  if (num < 0) throw new Error("Base62 encoding requires a positive integer");

  let result = "";
  let n = num;

  while (n > 0) {
    result = BASE62_CHARSET[n % 62] + result;
    n = Math.floor(n / 62);
  }

  return result;
}
