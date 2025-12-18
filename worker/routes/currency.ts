import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc } from 'drizzle-orm'
import { currencyRates } from '../../db/schema'

type Bindings = {
  DB: D1Database
}

export const currencyRoutes = new Hono<{ Bindings: Bindings }>()

// Get all current exchange rates at once
currencyRoutes.get('/rates/all', async (c) => {
  const db = drizzle(c.env.DB)
  
  try {
    const supportedCurrencies = ['BTC', 'USD', 'EUR', 'KZT']
    const rates: Record<string, number> = {}
    
    // Get all base rates from DB (X -> USD)
    const baseRates = await db
      .select()
      .from(currencyRates)
      .where(eq(currencyRates.toCurrency, 'USD'))
      .orderBy(desc(currencyRates.id))
      .all()
    
    // Group by currency and get the latest
    const latestBaseRates: Record<string, number> = {}
    const seen = new Set<string>()
    
    for (const rate of baseRates) {
      if (!seen.has(rate.fromCurrency)) {
        latestBaseRates[rate.fromCurrency] = rate.rate
        seen.add(rate.fromCurrency)
      }
    }
    
    // Calculate all currency pairs
    for (const from of supportedCurrencies) {
      for (const to of supportedCurrencies) {
        if (from === to) {
          rates[`${from}-${to}`] = 1
          continue
        }
        
        // Direct USD pairs
        if (from === 'USD' && latestBaseRates[to]) {
          rates[`${from}-${to}`] = 1 / latestBaseRates[to]
        } else if (to === 'USD' && latestBaseRates[from]) {
          rates[`${from}-${to}`] = latestBaseRates[from]
        } 
        // Cross-rates
        else if (latestBaseRates[from] && latestBaseRates[to]) {
          rates[`${from}-${to}`] = latestBaseRates[from] / latestBaseRates[to]
        }
      }
    }
    
    return c.json({
      rates,
      cached: true,
      currencies: supportedCurrencies,
    })
  } catch (error: any) {
    console.error('Error fetching all rates:', error)
    return c.json({ error: 'Failed to fetch rates' }, 500)
  }
})

// Helper function to get latest rate from DB or calculate cross-rate
async function getRate(db: ReturnType<typeof drizzle>, from: string, to: string): Promise<number | null> {
  // If same currency, rate is 1
  if (from === to) {
    return 1
  }
  
  // Special case: if from or to is USD, we only need one DB query
  if (from === 'USD') {
    // USD -> X: need to find latest X -> USD rate and invert it
    const xToUSD = await db
      .select()
      .from(currencyRates)
      .where(and(
        eq(currencyRates.fromCurrency, to),
        eq(currencyRates.toCurrency, 'USD')
      ))
      .orderBy(desc(currencyRates.updatedAt))
      .limit(1)
      .get()
    
    if (xToUSD) {
      return 1 / xToUSD.rate
    }
  } else if (to === 'USD') {
    // X -> USD: direct query for latest rate
    const fromToUSD = await db
      .select()
      .from(currencyRates)
      .where(and(
        eq(currencyRates.fromCurrency, from),
        eq(currencyRates.toCurrency, 'USD')
      ))
      .orderBy(desc(currencyRates.updatedAt))
      .limit(1)
      .get()
    
    if (fromToUSD) {
      return fromToUSD.rate
    }
  } else {
    // Cross-rate: X -> Y = (X -> USD) / (Y -> USD)
    // Example: EUR -> KZT = (EUR -> USD) / (KZT -> USD)
    const fromToUSD = await db
      .select()
      .from(currencyRates)
      .where(and(
        eq(currencyRates.fromCurrency, from),
        eq(currencyRates.toCurrency, 'USD')
      ))
      .orderBy(desc(currencyRates.updatedAt))
      .limit(1)
      .get()
    
    const toToUSD = await db
      .select()
      .from(currencyRates)
      .where(and(
        eq(currencyRates.fromCurrency, to),
        eq(currencyRates.toCurrency, 'USD')
      ))
      .orderBy(desc(currencyRates.updatedAt))
      .limit(1)
      .get()
    
    if (fromToUSD && toToUSD) {
      return fromToUSD.rate / toToUSD.rate
    }
  }
  
  return null
}

// Get exchange rate between two currencies
currencyRoutes.get('/rate/:from/:to', async (c) => {
  const from = c.req.param('from').toUpperCase()
  const to = c.req.param('to').toUpperCase()
  
  const db = drizzle(c.env.DB)
  
  try {
    const rate = await getRate(db, from, to)
    
    if (rate !== null) {
      return c.json({ from, to, rate, cached: true })
    }
    
    // No rate found in DB - currency rates are updated by cron job every 10 minutes
    return c.json({ 
      error: 'Currency rates not available yet. Please wait for the next update (runs every 10 minutes).' 
    }, 503)
  } catch (error) {
    console.error('Error fetching currency rate:', error)
    return c.json({ error: 'Failed to fetch currency rate' }, 500)
  }
})

// Convert amount from one currency to another
currencyRoutes.get('/convert/:from/:to/:amount', async (c) => {
  const from = c.req.param('from').toUpperCase()
  const to = c.req.param('to').toUpperCase()
  const amount = parseFloat(c.req.param('amount'))
  
  if (isNaN(amount)) {
    return c.json({ error: 'Invalid amount' }, 400)
  }
  
  const db = drizzle(c.env.DB)
  
  try {
    const rate = await getRate(db, from, to)
    
    if (rate !== null) {
      return c.json({
        from,
        to,
        amount,
        converted: amount * rate,
        rate,
        cached: true,
      })
    }
    
    // No rate found in DB - currency rates are updated by cron job every 10 minutes
    return c.json({ 
      error: 'Currency rates not available yet. Please wait for the next update (runs every 10 minutes).' 
    }, 503)
  } catch (error) {
    console.error('Error converting currency:', error)
    return c.json({ error: 'Failed to convert currency' }, 500)
  }
})

// Get all supported currencies
currencyRoutes.get('/supported', (c) => {
  return c.json({
    currencies: [
      { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'BTC', name: 'Bitcoin', symbol: '₿' },
    ],
  })
})

