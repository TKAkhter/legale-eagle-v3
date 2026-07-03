import { PublicClientApplication, type Configuration, type SilentRequest, type AuthenticationResult, BrowserCacheLocation, LogLevel } from '@azure/msal-browser'
import { env, featureFlags } from '@config/featureFlags'

function buildMsalConfig(): Configuration {
  return {
    auth: {
      clientId: env.VITE_AZURE_CLIENT_ID ?? '',
      authority: `https://login.microsoftonline.com/${env.VITE_AZURE_TENANT_ID ?? 'common'}`,
      redirectUri: env.VITE_AZURE_REDIRECT_URI ?? window.location.origin,
    },
    cache: { cacheLocation: BrowserCacheLocation.SessionStorage },
    system: {
      loggerOptions: {
        loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
          if (containsPii || !featureFlags.isDevelopment) return
          if (level === LogLevel.Error) console.error('[MSAL]', message)
        },
        logLevel: LogLevel.Error,
      },
    },
  }
}

export const MSAL_SCOPES = {
  login: ['openid', 'profile', 'email', 'User.Read'],
  oneDrive: ['Files.ReadWrite'],
  full: ['openid', 'profile', 'email', 'User.Read', 'Files.ReadWrite'],
}

let _msalInstance: PublicClientApplication | null = null
export function getMsalInstance(): PublicClientApplication {
  if (!_msalInstance) _msalInstance = new PublicClientApplication(buildMsalConfig())
  return _msalInstance
}

export async function msalLoginPopup(): Promise<AuthenticationResult> {
  const msal = getMsalInstance()
  await msal.initialize()
  return msal.loginPopup({ scopes: MSAL_SCOPES.full, prompt: 'select_account' })
}

export async function acquireTokenSilent(scopes = MSAL_SCOPES.full): Promise<string> {
  const msal = getMsalInstance()
  const accounts = msal.getAllAccounts()
  if (!accounts.length) throw new Error('No active account')
  const req: SilentRequest = { scopes, account: accounts[0] }
  try { return (await msal.acquireTokenSilent(req)).accessToken }
  catch { return (await msal.acquireTokenPopup({ scopes })).accessToken }
}

export async function msalSignOut(): Promise<void> {
  const msal = getMsalInstance()
  await msal.initialize()
  const accounts = msal.getAllAccounts()
  if (accounts.length) await msal.logoutPopup({ account: accounts[0] })
}

export async function getOneDriveToken(): Promise<string> { return acquireTokenSilent(MSAL_SCOPES.oneDrive) }
export async function getMicrosoftProfile() {
  const token = await acquireTokenSilent(MSAL_SCOPES.login)
  const r = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${token}` } })
  return r.json()
}
