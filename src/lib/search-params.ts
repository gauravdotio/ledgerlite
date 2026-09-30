type RawSearchParams = Record<string, string | string[] | undefined>;

/** Next gives repeated query keys as arrays; we only ever want the first value. */
export function firstValues(params: RawSearchParams): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
}
