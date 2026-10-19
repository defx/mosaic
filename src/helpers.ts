export const isPrimitive = (value: unknown): boolean =>
  value === null || typeof value !== "object"
