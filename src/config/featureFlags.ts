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

export type Env = z.infer<typeof envSchema>

function formatError(error: z.ZodError) {
  return error.issues
    .map(issue => `  • ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
}

function parseEnv(): Env {
  const result = envSchema.safeParse(import.meta.env)

  if (!result.success) {
    console.error(
      `[LegalEagle] Environment configuration is invalid:\n${formatError(result.error)}`
    )

    throw new Error('Invalid environment configuration')
  }

  return result.data
}

export const env = parseEnv()

export const featureFlags = {
  isDevelopment: env.VITE_APP_ENV === 'development',
  isProduction: env.VITE_APP_ENV === 'production',
  hasTolgee: Boolean(env.VITE_TOLGEE_API_URL && env.VITE_TOLGEE_API_KEY),
} as const
