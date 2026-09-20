export function successResponse<T>(data: T) {
  return {
    success: true as const,
    data,
    meta: { timestamp: new Date().toISOString() },
  };
}
