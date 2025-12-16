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

// Helper function to get rate from DB or calculate cross-rate
async function getRate(db: ReturnType<typeof drizzle>, from: string, to: string): Promise<number | null> {
  // If same currency, rate is 1
  if (from === to) {
    return 1
  }
  
  // Try to get direct rate from DB
  const directRate = await db
    .select()
    .from(currencyRates)
    .where(and(
      eq(currencyRates.fromCurrency, from),
      eq(currencyRates.toCurrency, to)
    ))
    .get()
  
  if (directRate) {
    return directRate.rate
  }
  
  // If no direct rate, calculate cross-rate through USD
  // For example: EUR -> KZT = (EUR -> USD) * (USD -> KZT)
  const fromToUSD = await db
    .select()
    .from(currencyRates)
    .where(and(
      eq(currencyRates.fromCurrency, from),
      eq(currencyRates.toCurrency, 'USD')
    ))
    .get()
  
  const usdToTarget = await db
    .select()
    .from(currencyRates)
    .where(and(
      eq(currencyRates.fromCurrency, 'USD'),
      eq(currencyRates.toCurrency, to)
    ))
    .get()
  
  if (fromToUSD && usdToTarget) {
    return fromToUSD.rate * usdToTarget.rate
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
    
    // If no rate found in DB, try external API as fallback
    const externalRate = await fetchExchangeRate(from, to)
    return c.json({ from, to, rate: externalRate, cached: false })
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
    
    // If no rate found in DB, try external API as fallback
    const externalRate = await fetchExchangeRate(from, to)
    
    return c.json({
      from,
      to,
      amount,
      converted: amount * externalRate,
      rate: externalRate,
      cached: false,
    })
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

