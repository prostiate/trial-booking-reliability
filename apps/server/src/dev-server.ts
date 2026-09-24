import { serve } from '@hono/node-server';
import app from './index';

const port = Number(process.env.PORT || 24001);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`[server] @trial-booking/server listening on http://localhost:${info.port}`);
  }
);
