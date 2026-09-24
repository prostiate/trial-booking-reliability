import { hc } from 'hono/client';
import type { AppType } from '@trial-booking/server';

export function createTrialBookingClient(baseUrl = '') {
  return hc<AppType>(baseUrl);
}

export type TrialBookingApiClient = ReturnType<typeof createTrialBookingClient>;
