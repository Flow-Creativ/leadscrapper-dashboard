import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'id'],

  // Used when no locale matches
  defaultLocale: 'en',

  // Don't use locale prefix in URL (cookie-based)
  localePrefix: 'never'
});
