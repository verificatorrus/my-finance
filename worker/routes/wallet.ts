import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { wallets } from '../../db/schema'
import { nanoid } from 'nanoid'
import { getFirebaseToken } from '@hono/firebase-auth'

type Bindings = {
  DB: D1Database
}

export const walletRoutes = new Hono<{ Bindings: Bindings }>()

// Get all wallets for the current user (excluding archived by default)
walletRoutes.get('/', async (c) => {
  const firebaseToken = getFirebaseToken(c)
  
  if (!firebaseToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = drizzle(c.env.DB)
  const includeArchived = c.req.query('includeArchived') === 'true'
  
  const userWallets = includeArchived
    ? await db.select().from(wallets).where(eq(wallets.userId, firebaseToken.uid)).all()
    : await db.select().from(wallets).where(
        and(eq(wallets.userId, firebaseToken.uid), eq(wallets.archived, false))
      ).all()
  
  return c.json(userWallets)
})

// Get specific wallet
walletRoutes.get('/:id', async (c) => {
  const firebaseToken = getFirebaseToken(c)
  const walletId = c.req.param('id')
  
  if (!firebaseToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = drizzle(c.env.DB)
  const wallet = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.id, walletId), eq(wallets.userId, firebaseToken.uid)))
    .get()
  
  if (!wallet) {
    return c.json({ error: 'Wallet not found' }, 404)
  }
  
  return c.json(wallet)
})

// Create new wallet
walletRoutes.post('/', async (c) => {
  const firebaseToken = getFirebaseToken(c)
  
  if (!firebaseToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  
  const { name, type, currency, icon } = body
  
  if (!name || !type || !currency) {
    return c.json({ error: 'Name, type and currency are required' }, 400)
  }
  
  const validTypes = ['wallet', 'savings', 'bank_account', 'crypto_wallet']
  if (!validTypes.includes(type)) {
    return c.json({ error: 'Invalid wallet type' }, 400)
  }
  
  const validCurrencies = ['KZT', 'USD', 'EUR', 'BTC']
  if (!validCurrencies.includes(currency)) {
    return c.json({ error: 'Invalid currency' }, 400)
  }
  
  const newWallet = {
    id: nanoid(),
    userId: firebaseToken.uid,
    name,
    type,
    currency,
    balance: 0, // Always start at 0, balance managed by transactions
    icon: icon || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  
  await db.insert(wallets).values(newWallet)
  
  return c.json(newWallet, 201)
})

// Update wallet
walletRoutes.put('/:id', async (c) => {
  const firebaseToken = getFirebaseToken(c)
  const walletId = c.req.param('id')
  
  if (!firebaseToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = drizzle(c.env.DB)
  
  // Check if wallet belongs to user
  const existingWallet = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.id, walletId), eq(wallets.userId, firebaseToken.uid)))
    .get()
  
  if (!existingWallet) {
    return c.json({ error: 'Wallet not found' }, 404)
  }
  
  const body = await c.req.json()
  const { name, type, currency, icon } = body
  
  const updateData: any = {
    updatedAt: new Date(),
  }
  
  if (name !== undefined) updateData.name = name
  if (type !== undefined) {
    const validTypes = ['wallet', 'savings', 'bank_account', 'crypto_wallet']
    if (!validTypes.includes(type)) {
      return c.json({ error: 'Invalid wallet type' }, 400)
    }
    updateData.type = type
  }
  if (currency !== undefined) {
    const validCurrencies = ['KZT', 'USD', 'EUR', 'BTC']
    if (!validCurrencies.includes(currency)) {
      return c.json({ error: 'Invalid currency' }, 400)
    }
    updateData.currency = currency
  }
  if (icon !== undefined) updateData.icon = icon
  // Note: balance is never updated directly - it's managed by transactions only
  
  await db.update(wallets).set(updateData).where(eq(wallets.id, walletId))
  
  const updatedWallet = await db
    .select()
    .from(wallets)
    .where(eq(wallets.id, walletId))
    .get()
  
  return c.json(updatedWallet)
})

// Archive wallet (soft delete)
walletRoutes.delete('/:id', async (c) => {
  const firebaseToken = getFirebaseToken(c)
  const walletId = c.req.param('id')
  
  if (!firebaseToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = drizzle(c.env.DB)
  
  // Check if wallet belongs to user
  const existingWallet = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.id, walletId), eq(wallets.userId, firebaseToken.uid)))
    .get()
  
  if (!existingWallet) {
    return c.json({ error: 'Wallet not found' }, 404)
  }
  
  // Check if balance is zero
  if (existingWallet.balance !== 0) {
    return c.json({ 
      error: `Cannot archive wallet with non-zero balance. Current balance: ${existingWallet.balance}` 
    }, 400)
  }
  
  // Archive the wallet instead of deleting
  await db
    .update(wallets)
    .set({ 
      archived: true,
      updatedAt: new Date(),
    })
    .where(eq(wallets.id, walletId))
  
  return c.json({ success: true, archived: true })
})

// Unarchive wallet
walletRoutes.post('/:id/unarchive', async (c) => {
  const firebaseToken = getFirebaseToken(c)
  const walletId = c.req.param('id')
  
  if (!firebaseToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = drizzle(c.env.DB)
  
  // Check if wallet belongs to user
  const existingWallet = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.id, walletId), eq(wallets.userId, firebaseToken.uid)))
    .get()
  
  if (!existingWallet) {
    return c.json({ error: 'Wallet not found' }, 404)
  }
  
  // Unarchive the wallet
  await db
    .update(wallets)
    .set({ 
      archived: false,
      updatedAt: new Date(),
    })
    .where(eq(wallets.id, walletId))
  
  return c.json({ success: true, archived: false })
})

