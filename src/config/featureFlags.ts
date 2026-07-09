import { z } from 'zod'

const boolFromString = z.enum(['true', 'false']).optional().transform(v => v === 'true')

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1, 'VITE_API_BASE_URL is required'),
  VITE_ENABLE_USER_REGISTRATION: boolFromString,
  VITE_FORCE_MICROSOFT_SSO: boolFromString,
  VITE_AZURE_CLIENT_ID: z.string().optional(),
  VITE_AZURE_TENANT_ID: z.string().optional(),
  VITE_AZURE_REDIRECT_URI: z.string().optional(),
  VITE_ONEDRIVE_CLIENT_ID: z.string().optional(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).optional(),
  VITE_TOLGEE_API_URL: z.string().optional(),
  VITE_TOLGEE_API_KEY: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.VITE_FORCE_MICROSOFT_SSO && !data.VITE_AZURE_CLIENT_ID) {
    ctx.addIssue({ code: 'custom', message: 'VITE_AZURE_CLIENT_ID required when SSO forced', path: ['VITE_AZURE_CLIENT_ID'] })
  }
})

function parseEnv() {
  const raw = {
    VITE_API_BASE_URL: (import.meta.env['VITE_API_BASE_URL'] as string) ?? '',
    VITE_ENABLE_USER_REGISTRATION: (import.meta.env['VITE_ENABLE_USER_REGISTRATION'] as string) ?? 'false',
    VITE_FORCE_MICROSOFT_SSO: (import.meta.env['VITE_FORCE_MICROSOFT_SSO'] as string) ?? 'false',
    VITE_AZURE_CLIENT_ID: import.meta.env['VITE_AZURE_CLIENT_ID'] as string | undefined,
    VITE_AZURE_TENANT_ID: import.meta.env['VITE_AZURE_TENANT_ID'] as string | undefined,
    VITE_AZURE_REDIRECT_URI: import.meta.env['VITE_AZURE_REDIRECT_URI'] as string | undefined,
    VITE_ONEDRIVE_CLIENT_ID: import.meta.env['VITE_ONEDRIVE_CLIENT_ID'] as string | undefined,
    VITE_APP_ENV: (import.meta.env['VITE_APP_ENV'] as string) ?? 'development',
    VITE_TOLGEE_API_URL: import.meta.env['VITE_TOLGEE_API_URL'] as string | undefined,
    VITE_TOLGEE_API_KEY: import.meta.env['VITE_TOLGEE_API_KEY'] as string | undefined,
  }
  const result = envSchema.safeParse(raw)
  if (!result.success) {
    const msgs = result.error.issues.map(e => `  • ${e.path.join('.')}: ${e.message}`).join('\n')
    console.error(`[LegalEagle] Env config error:\n${msgs}`)
    return {
      VITE_API_BASE_URL: raw.VITE_API_BASE_URL,
      VITE_ENABLE_USER_REGISTRATION: raw.VITE_ENABLE_USER_REGISTRATION === 'true',
      VITE_FORCE_MICROSOFT_SSO: raw.VITE_FORCE_MICROSOFT_SSO === 'true',
      VITE_AZURE_CLIENT_ID: raw.VITE_AZURE_CLIENT_ID,
      VITE_AZURE_TENANT_ID: raw.VITE_AZURE_TENANT_ID,
      VITE_AZURE_REDIRECT_URI: raw.VITE_AZURE_REDIRECT_URI,
      VITE_ONEDRIVE_CLIENT_ID: raw.VITE_ONEDRIVE_CLIENT_ID,
      VITE_APP_ENV: (raw.VITE_APP_ENV as 'development'|'staging'|'production') ?? 'development',
      VITE_TOLGEE_API_URL: raw.VITE_TOLGEE_API_URL,
      VITE_TOLGEE_API_KEY: raw.VITE_TOLGEE_API_KEY,
    }
  }
  return {
    ...result.data,
    VITE_APP_ENV: result.data.VITE_APP_ENV ?? 'development' as const,
  }
}

export const env = parseEnv()
export const featureFlags = {
  enableUserRegistration: env.VITE_ENABLE_USER_REGISTRATION,
  forceMicrosoftSSO: env.VITE_FORCE_MICROSOFT_SSO,
  isDevelopment: env.VITE_APP_ENV === 'development',
  isProduction: env.VITE_APP_ENV === 'production',
  hasTolgee: Boolean(env.VITE_TOLGEE_API_URL && env.VITE_TOLGEE_API_KEY),
} as const
