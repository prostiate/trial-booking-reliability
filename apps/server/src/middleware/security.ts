import type { MiddlewareHandler } from 'hono';

export function securityHeadersMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const contentLength = Number(c.req.header('content-length') ?? '0');
    if (contentLength > 64 * 1024) {
      return c.json(
        {
          ok: false,
          errorCode: 'VALIDATION_ERROR',
          message: 'Request payload exceeds 64KB limit.',
          data: null,
        },
        413
      );
    }

    await next();

    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; frame-ancestors 'none'; base-uri 'self'"
    );
  };
}
