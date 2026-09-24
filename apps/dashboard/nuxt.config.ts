const apiProxyTarget =
  process.env.NUXT_API_PROXY_TARGET ||
  (process.env.NODE_ENV === 'production'
    ? 'https://trial-booking-reliability.irfankurniawan.com'
    : 'http://127.0.0.1:24001');

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@vueuse/nuxt', '@pinia/nuxt'],

  ssr: false,

  devtools: {
    enabled: false,
  },

  app: {
    head: {
      title: 'Ottodot Trial Booking',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#1d4ed8' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'light',
    fallback: 'light',
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || '',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:24002',
    },
  },

  routeRules: {
    '/api/**': {
      proxy: {
        to: `${apiProxyTarget}/api/**`,
      },
    },
  },

  compatibilityDate: '2025-04-01',

  nitro: {
    preset: process.env.NITRO_PRESET || 'cloudflare_module',
  },

  eslint: {
    config: {
      stylistic: false,
    },
  },

  icon: {
    localApiEndpoint: '/_nuxt_icon',
    provider: 'server',
    clientBundle: {
      scan: true,
      sizeLimitKb: 256,
      icons: [
        'lucide:check',
        'lucide:check-circle',
        'lucide:alert-circle',
        'lucide:alert-triangle',
        'lucide:clock',
        'lucide:credit-card',
        'lucide:rotate-ccw',
        'lucide:users',
        'lucide:history',
        'lucide:play',
        'lucide:calendar',
        'lucide:shield-alert',
      ],
    },
  },
});
