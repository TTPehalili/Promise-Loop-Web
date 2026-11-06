// Outbound destinations. Set in .env.local / host env (see .env.example).
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://promiseloop.com";

// "Book a demo" / "Get your quote". TODO: set NEXT_PUBLIC_DEMO_URL to the real booking calendar.
export const demoUrl =
  process.env.NEXT_PUBLIC_DEMO_URL || "mailto:hello@promiseloop.com?subject=Book%20a%20demo";

// "Log in". TODO: set NEXT_PUBLIC_APP_LOGIN_URL to the app's login page.
export const loginUrl = process.env.NEXT_PUBLIC_APP_LOGIN_URL || "https://app.promiseloop.com/login";

export const contactEmail = "hello@promiseloop.com";

export const isExternal = (href: string) => /^(https?:|mailto:)/.test(href);
