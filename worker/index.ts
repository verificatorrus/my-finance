import { Hono } from 'hono'
import { 
  verifyFirebaseAuth, 
  type VerifyFirebaseAuthConfig,
  type VerifyFirebaseAuthEnv,
  getFirebaseToken
} from '@hono/firebase-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import { userRoutes } from './routes/user'
import { walletRoutes } from './routes/wallet'
import { currencyRoutes } from './routes/currency'
import { transactionRoutes } from './routes/transaction'
import { updateCurrencyRates } from './cron/updateCurrencyRates'

type Bindings = VerifyFirebaseAuthEnv & {
  DB: D1Database
  COINMARKETCAP_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Only handle /api routes
app.use('/api/*', async (c, next) => {
  // CORS for API routes
  const origin = c.req.header('origin') || '*'
  c.header('Access-Control-Allow-Origin', origin)
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  
  await next()
})

// Helper function to create a short hash of kid for KV key
async function hashKid(kid: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(kid)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32)
}

// Firebase Auth configuration
const firebaseAuthConfig: VerifyFirebaseAuthConfig = {
  projectId: 'my-finace-dev',
  authorizationHeaderKey: 'Authorization',
  // @ts-expect-error - KeyStorer type mismatch with actual implementation
  keyStoreInitializer: (c) => {
    return {
      get: async (kid: string) => {
        const cache = c.env.PUBLIC_JWK_CACHE_KV
        // Hash the kid to ensure it fits in KV key length limit
        const hashedKid = await hashKid(kid)
        const cachedData = await cache.get(hashedKid)
        if (cachedData) {
          return JSON.parse(cachedData)
        }
        return null
      },
      put: async (kid: string, key: JsonWebKey) => {
        const cache = c.env.PUBLIC_JWK_CACHE_KV
        // Hash the kid to ensure it fits in KV key length limit
        const hashedKid = await hashKid(kid)
        await cache.put(hashedKid, JSON.stringify(key), {
          expirationTtl: 3600, // 1 hour
        })
      },
    }
  },
}

// Health check (public route, no auth)
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() })
})

// Manual trigger for currency rates update (public route for testing)
app.post('/api/update-rates', async (c) => {
  try {
    const { updateCurrencyRates } = await import('./cron/updateCurrencyRates')
    await updateCurrencyRates(c.env.DB, c.env.COINMARKETCAP_API_KEY)
    return c.json({ success: true, message: 'Currency rates updated successfully' })
  } catch (error: any) {
    console.error('Failed to update currency rates:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Firebase Auth middleware for protected routes
app.use('/api/*', verifyFirebaseAuth(firebaseAuthConfig))

// Middleware to ensure user exists in DB and email is verified
app.use('/api/*', async (c, next) => {
  const firebaseToken = getFirebaseToken(c)
  
  if (firebaseToken) {
    // Check if email is verified
    if (!firebaseToken.email_verified) {
      return c.json({ error: 'Please verify your email before using the app' }, 403)
    }
    
    const db = drizzle(c.env.DB)
    
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.id, firebaseToken.uid)).get()
    
    // Create user if doesn't exist
    if (!existingUser) {
      await db.insert(users).values({
        id: firebaseToken.uid,
        email: firebaseToken.email || '',
        defaultCurrency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  }
  
  await next()
})

// Protected routes
app.route('/api/user', userRoutes)
app.route('/api/wallets', walletRoutes)
app.route('/api/currency', currencyRoutes)
app.route('/api/transactions', transactionRoutes)

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

// Scheduled event handler for cron triggers
export default {
  fetch: app.fetch,
  async scheduled(
    controller: ScheduledController,
    env: Bindings
  ): Promise<void> {
    console.log('Cron trigger fired:', controller.scheduledTime)
    
    try {
      // Wait for the currency rates update to complete
      await updateCurrencyRates(env.DB, env.COINMARKETCAP_API_KEY)
      console.log('Currency rates updated successfully via cron')
    } catch (error) {
      console.error('Failed to update currency rates via cron:', error)
      // Don't throw - we want the cron job to continue running
    }
  }
}
