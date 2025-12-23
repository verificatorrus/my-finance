import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { users } from '../../db/schema'
import { getFirebaseToken } from '@hono/firebase-auth'

type Bindings = {
  DB: D1Database
}

export const userRoutes = new Hono<{ Bindings: Bindings }>()

// Get or create user profile
userRoutes.get('/profile', async (c) => {
  const firebaseToken = getFirebaseToken(c)
  
  if (!firebaseToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = drizzle(c.env.DB)
  
  // Try to find existing user
  let user = await db.select().from(users).where(eq(users.id, firebaseToken.uid)).get()
  
  // If user doesn't exist, create one
  if (!user) {
    const newUser = {
      id: firebaseToken.uid,
      email: firebaseToken.email || '',
      defaultCurrency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    await db.insert(users).values(newUser)
    user = newUser
  }
  
  return c.json(user)
})

// Update user profile
userRoutes.put('/profile', async (c) => {
  const firebaseToken = getFirebaseToken(c)
  
  if (!firebaseToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  
  const { defaultCurrency } = body
  
  if (!defaultCurrency) {
    return c.json({ error: 'Default currency is required' }, 400)
  }
  
  await db
    .update(users)
    .set({ 
      defaultCurrency,
      updatedAt: new Date(),
    })
    .where(eq(users.id, firebaseToken.uid))
  
  const updatedUser = await db.select().from(users).where(eq(users.id, firebaseToken.uid)).get()
  
  return c.json(updatedUser)
})

