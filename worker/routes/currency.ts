import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { currencyRates } from '../../db/schema'

type Bindings = {
  DB: D1Database
}

export const currencyRoutes = new Hono<{ Bindings: Bindings }>()

// Fetch exchange rate from external API
async function fetchExchangeRate(from: string, to: string): Promise<number> {
  // For crypto currencies, use CoinGecko API
  if (from === 'BTC') {
    const currencyMap: Record<string, string> = {
      'USD': 'usd',
      'EUR': 'eur',
      'KZT': 'kzt',
    }
    
    const vsCurrency = currencyMap[to]
    if (!vsCurrency) throw new Error('Unsupported currency pair')
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${vsCurrency}`
    )
    
    if (!response.ok) throw new Error('Failed to fetch crypto rate')
    
    const data: any = await response.json()
    return data.bitcoin[vsCurrency]
  }
  
  // For fiat currencies, use ExchangeRate-API
  const response = await fetch(
    `https://api.exchangerate-api.com/v4/latest/${from}`
  )
  
  if (!response.ok) throw new Error('Failed to fetch exchange rate')
  
  const data: any = await response.json()
  
  if (!data.rates[to]) {
    throw new Error('Currency not supported')
  }
  
  return data.rates[to]
}

// Get exchange rate between two currencies
currencyRoutes.get('/rate/:from/:to', async (c) => {
  const from = c.req.param('from').toUpperCase()
  const to = c.req.param('to').toUpperCase()
  
  // If same currency, rate is 1
  if (from === to) {
    return c.json({ from, to, rate: 1 })
  }
  
  const db = drizzle(c.env.DB)
  
  // Check if we have a cached rate (less than 1 hour old)
  const cachedRate = await db
    .select()
    .from(currencyRates)
    .where(and(
      eq(currencyRates.fromCurrency, from),
      eq(currencyRates.toCurrency, to)
    ))
    .get()
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  
  if (cachedRate && cachedRate.updatedAt > oneHourAgo) {
    return c.json({ from, to, rate: cachedRate.rate, cached: true })
  }
  
  // Fetch fresh rate from external API
  try {
    const rate = await fetchExchangeRate(from, to)
    
    // Update or insert the rate in cache
    if (cachedRate) {
      await db
        .update(currencyRates)
        .set({ rate, updatedAt: new Date() })
        .where(and(
          eq(currencyRates.fromCurrency, from),
          eq(currencyRates.toCurrency, to)
        ))
    } else {
      await db.insert(currencyRates).values({
        fromCurrency: from,
        toCurrency: to,
        rate,
        updatedAt: new Date(),
      })
    }
    
    return c.json({ from, to, rate, cached: false })
  } catch (error) {
    console.error('Error fetching currency rate:', error)
    
    // If we have a cached rate (even if old), return it
    if (cachedRate) {
      return c.json({ from, to, rate: cachedRate.rate, cached: true, stale: true })
    }
    
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
  
  if (from === to) {
    return c.json({ from, to, amount, converted: amount, rate: 1 })
  }
  
  const db = drizzle(c.env.DB)
  
  // Check cache first
  const cachedRate = await db
    .select()
    .from(currencyRates)
    .where(and(
      eq(currencyRates.fromCurrency, from),
      eq(currencyRates.toCurrency, to)
    ))
    .get()
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  
  if (cachedRate && cachedRate.updatedAt > oneHourAgo) {
    return c.json({
      from,
      to,
      amount,
      converted: amount * cachedRate.rate,
      rate: cachedRate.rate,
      cached: true,
    })
  }
  
  // Fetch fresh rate
  try {
    const rate = await fetchExchangeRate(from, to)
    
    // Update cache
    if (cachedRate) {
      await db
        .update(currencyRates)
        .set({ rate, updatedAt: new Date() })
        .where(and(
          eq(currencyRates.fromCurrency, from),
          eq(currencyRates.toCurrency, to)
        ))
    } else {
      await db.insert(currencyRates).values({
        fromCurrency: from,
        toCurrency: to,
        rate,
        updatedAt: new Date(),
      })
    }
    
    return c.json({
      from,
      to,
      amount,
      converted: amount * rate,
      rate,
      cached: false,
    })
  } catch (error) {
    console.error('Error converting currency:', error)
    
    if (cachedRate) {
      return c.json({
        from,
        to,
        amount,
        converted: amount * cachedRate.rate,
        rate: cachedRate.rate,
        cached: true,
        stale: true,
      })
    }
    
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

