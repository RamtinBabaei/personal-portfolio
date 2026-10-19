declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    DATABASE_URL?: string;
    RESEND_API_KEY?: string;
    CONTACT_FROM?: string;
    SITE_URL?: string;
    RATE_LIMIT_SALT?: string;
    OWNER_PRIVATE_MODE?: string;
    ADMIN_AUTH_MODE?: string;
    ADMIN_USER_ID?: string;
    IDENTITY_PROXY_SECRET?: string;
    ADMIN_USERNAME?: string;
    ADMIN_PASSWORD?: string;
    CRON_SECRET?: string;
    CONTACT_RATE_LIMIT_PER_HOUR?: string;
  }
}
