import { randomUUID } from "node:crypto";

export function createId(prefix?: string) {
  const value = randomUUID();
  return prefix ? `${prefix}_${value}` : value;
}
