import { createTrialBookingClient } from '@trial-booking/api-client';

export function useApiClient() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiUrl ? String(config.public.apiUrl) : '';
  return createTrialBookingClient(baseUrl);
}
