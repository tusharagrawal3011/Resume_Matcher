export function toPositiveNumber(value: string | undefined, defaultValue: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export function toStringOrDefault(value: string | undefined, defaultValue: string): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : defaultValue;
}
