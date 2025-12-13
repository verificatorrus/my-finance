import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc } from 'drizzle-orm'
import { transactions, wallets } from '../../db/schema'
import { nanoid } from 'nanoid'
import { getFirebaseToken } from '@hono/firebase-auth'

type Bindings = {
  DB: D1Database
}

export const transactionRoutes = new Hono<{ Bindings: Bindings }>()

// Get all transactions for the current user
transactionRoutes.get('/', async (c) => {
  const firebaseToken = getFirebaseToken(c)
  
  if (!firebaseToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = drizzle(c.env.DB)
  const userTransactions = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, firebaseToken.uid))
    .orderBy(desc(transactions.date))
    .all()
  
  return c.json(userTransactions)
})

// Get transactions for a specific wallet
transactionRoutes.get('/wallet/:walletId', async (c) => {
  const firebaseToken = getFirebaseToken(c)
  const walletId = c.req.param('walletId')
  
  if (!firebaseToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = drizzle(c.env.DB)
  
  // Verify wallet belongs to user
  const wallet = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.id, walletId), eq(wallets.userId, firebaseToken.uid)))
    .get()
  
  if (!wallet) {
    return c.json({ error: 'Wallet not found' }, 404)
  }
  
  // Get transactions where wallet is either source or destination
  const walletTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, firebaseToken.uid),
        // TODO: Add OR condition for fromWalletId or toWalletId
      )
    )
    .orderBy(desc(transactions.date))
    .all()
  
  return c.json(walletTransactions)
})

// Create income transaction (deposit to wallet)
transactionRoutes.post('/income', async (c) => {
  const firebaseToken = getFirebaseToken(c)
  
  if (!firebaseToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  
  const { toWalletId, amount, category, description, date } = body
  
  if (!toWalletId || !amount || amount <= 0) {
    return c.json({ error: 'Wallet ID and positive amount are required' }, 400)
  }
  
  // Verify wallet belongs to user
  const wallet = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.id, toWalletId), eq(wallets.userId, firebaseToken.uid)))
    .get()
  
  if (!wallet) {
    return c.json({ error: 'Wallet not found' }, 404)
  }
  
  // Create transaction
  const newTransaction = {
    id: nanoid(),
    userId: firebaseToken.uid,
    type: 'income',
    fromWalletId: null,
    toWalletId,
    amount: parseFloat(amount),
    currency: wallet.currency,
    category: category || 'Income',
    description: description || null,
    date: date ? new Date(date) : new Date(),
    createdAt: new Date(),
  }
  
  await db.insert(transactions).values(newTransaction)
  
  // Update wallet balance
  await db
    .update(wallets)
    .set({ 
      balance: wallet.balance + parseFloat(amount),
      updatedAt: new Date(),
    })
    .where(eq(wallets.id, toWalletId))
  
  return c.json(newTransaction, 201)
})

// Create expense transaction (withdraw from wallet)
transactionRoutes.post('/expense', async (c) => {
  const firebaseToken = getFirebaseToken(c)
  
  if (!firebaseToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  
  const { fromWalletId, amount, category, description, date } = body
  
  if (!fromWalletId || !amount || amount <= 0) {
    return c.json({ error: 'Wallet ID and positive amount are required' }, 400)
  }
  
  // Verify wallet belongs to user
  const wallet = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.id, fromWalletId), eq(wallets.userId, firebaseToken.uid)))
    .get()
  
  if (!wallet) {
    return c.json({ error: 'Wallet not found' }, 404)
  }
  
  // Check sufficient balance
  if (wallet.balance < parseFloat(amount)) {
    return c.json({ error: 'Insufficient balance' }, 400)
  }
  
  // Create transaction
  const newTransaction = {
    id: nanoid(),
    userId: firebaseToken.uid,
    type: 'expense',
    fromWalletId,
    toWalletId: null,
    amount: parseFloat(amount),
    currency: wallet.currency,
    category: category || 'Expense',
    description: description || null,
    date: date ? new Date(date) : new Date(),
    createdAt: new Date(),
  }
  
  await db.insert(transactions).values(newTransaction)
  
  // Update wallet balance
  await db
    .update(wallets)
    .set({ 
      balance: wallet.balance - parseFloat(amount),
      updatedAt: new Date(),
    })
    .where(eq(wallets.id, fromWalletId))
  
  return c.json(newTransaction, 201)
})

// Create transfer transaction (between wallets)
transactionRoutes.post('/transfer', async (c) => {
  const firebaseToken = getFirebaseToken(c)
  
  if (!firebaseToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = drizzle(c.env.DB)
  const body = await c.req.json()
  
  const { fromWalletId, toWalletId, amount, description, date } = body
  
  if (!fromWalletId || !toWalletId || !amount || amount <= 0) {
    return c.json({ error: 'Both wallet IDs and positive amount are required' }, 400)
  }
  
  if (fromWalletId === toWalletId) {
    return c.json({ error: 'Cannot transfer to the same wallet' }, 400)
  }
  
  // Verify both wallets belong to user
  const fromWallet = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.id, fromWalletId), eq(wallets.userId, firebaseToken.uid)))
    .get()
  
  const toWallet = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.id, toWalletId), eq(wallets.userId, firebaseToken.uid)))
    .get()
  
  if (!fromWallet || !toWallet) {
    return c.json({ error: 'One or both wallets not found' }, 404)
  }
  
  // Check if currencies match
  if (fromWallet.currency !== toWallet.currency) {
    return c.json({ 
      error: 'Cannot transfer between wallets with different currencies. Use expense from one wallet and income to another instead.' 
    }, 400)
  }
  
  // Check sufficient balance
  if (fromWallet.balance < parseFloat(amount)) {
    return c.json({ error: 'Insufficient balance' }, 400)
  }
  
  // Create transaction
  const newTransaction = {
    id: nanoid(),
    userId: firebaseToken.uid,
    type: 'transfer',
    fromWalletId,
    toWalletId,
    amount: parseFloat(amount),
    currency: fromWallet.currency, // Use source wallet currency
    category: 'Transfer',
    description: description || null,
    date: date ? new Date(date) : new Date(),
    createdAt: new Date(),
  }
  
  await db.insert(transactions).values(newTransaction)
  
  // Update both wallet balances
  await db
    .update(wallets)
    .set({ 
      balance: fromWallet.balance - parseFloat(amount),
      updatedAt: new Date(),
    })
    .where(eq(wallets.id, fromWalletId))
  
  await db
    .update(wallets)
    .set({ 
      balance: toWallet.balance + parseFloat(amount),
      updatedAt: new Date(),
    })
    .where(eq(wallets.id, toWalletId))
  
  return c.json(newTransaction, 201)
})

// Delete transaction
transactionRoutes.delete('/:id', async (c) => {
  const firebaseToken = getFirebaseToken(c)
  const transactionId = c.req.param('id')
  
  if (!firebaseToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db = drizzle(c.env.DB)
  
  // Get transaction
  const transaction = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, firebaseToken.uid)))
    .get()
  
  if (!transaction) {
    return c.json({ error: 'Transaction not found' }, 404)
  }
  
  // Reverse the transaction effects on wallet balances
  if (transaction.type === 'income' && transaction.toWalletId) {
    const wallet = await db.select().from(wallets).where(eq(wallets.id, transaction.toWalletId)).get()
    if (wallet) {
      await db
        .update(wallets)
        .set({ 
          balance: wallet.balance - transaction.amount,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, transaction.toWalletId))
    }
  } else if (transaction.type === 'expense' && transaction.fromWalletId) {
    const wallet = await db.select().from(wallets).where(eq(wallets.id, transaction.fromWalletId)).get()
    if (wallet) {
      await db
        .update(wallets)
        .set({ 
          balance: wallet.balance + transaction.amount,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, transaction.fromWalletId))
    }
  } else if (transaction.type === 'transfer' && transaction.fromWalletId && transaction.toWalletId) {
    const fromWallet = await db.select().from(wallets).where(eq(wallets.id, transaction.fromWalletId)).get()
    const toWallet = await db.select().from(wallets).where(eq(wallets.id, transaction.toWalletId)).get()
    
    if (fromWallet) {
      await db
        .update(wallets)
        .set({ 
          balance: fromWallet.balance + transaction.amount,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, transaction.fromWalletId))
    }
    
    if (toWallet) {
      await db
        .update(wallets)
        .set({ 
          balance: toWallet.balance - transaction.amount,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, transaction.toWalletId))
    }
  }
  
  // Delete transaction
  await db.delete(transactions).where(eq(transactions.id, transactionId))
  
  return c.json({ success: true })
})

