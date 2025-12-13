import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Firebase UID
  email: text('email').notNull().unique(),
  defaultCurrency: text('default_currency').notNull().default('USD'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// Wallets table - stores different places where user keeps money
export const wallets = sqliteTable('wallets', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "Main Wallet", "Savings", "Bank Account"
  type: text('type').notNull(), // wallet, savings, bank_account, crypto_wallet
  currency: text('currency').notNull(), // KZT, USD, EUR, BTC
  balance: real('balance').notNull().default(0),
  icon: text('icon'), // optional icon/emoji for the wallet
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// Currency rates cache table
export const currencyRates = sqliteTable('currency_rates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fromCurrency: text('from_currency').notNull(),
  toCurrency: text('to_currency').notNull(),
  rate: real('rate').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// Transactions table - stores all wallet operations
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // income, expense, transfer
  fromWalletId: text('from_wallet_id').references(() => wallets.id, { onDelete: 'set null' }),
  toWalletId: text('to_wallet_id').references(() => wallets.id, { onDelete: 'set null' }),
  amount: real('amount').notNull(),
  currency: text('currency').notNull(),
  category: text('category'), // e.g., "Food", "Transport", "Salary", "Transfer"
  description: text('description'),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// Indexes for better query performance
export const currencyRatesIndex = sql`
  CREATE UNIQUE INDEX IF NOT EXISTS currency_rates_pair_idx 
  ON currency_rates(from_currency, to_currency)
`

