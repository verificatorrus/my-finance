import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc, gte } from 'drizzle-orm'
import { currencyRates } from '../../db/schema'

type Bindings = {
  DB: D1Database
}

export const currencyHistoryRoutes = new Hono<{ Bindings: Bindings }>()

interface HistoricalRate {
  rate: number
  timestamp: number
}

// Calculate cross-rate from two USD rates
function calculateCrossRate(fromRate: number, toRate: number): number {
  // fromRate: X->USD rate
  // toRate: Y->USD rate
  // Result: X->Y = fromRate / toRate
  return fromRate / toRate
}

// Get historical rates for a currency pair
currencyHistoryRoutes.get('/history/:from/:to', async (c) => {
  const from = c.req.param('from').toUpperCase()
  const to = c.req.param('to').toUpperCase()
  const period = c.req.query('period') || '7d' // 7d, 30d, 1y, all
  const startDateParam = c.req.query('start')
  
  const db = drizzle(c.env.DB)
  
  try {
    // Calculate start date based on period or custom range
    let startDate: Date
    
    if (startDateParam) {
      startDate = new Date(parseInt(startDateParam))
    } else {
      const now = Date.now()
      switch (period) {
        case '1h':
          startDate = new Date(now - 60 * 60 * 1000)
          break
        case '24h':
          startDate = new Date(now - 24 * 60 * 60 * 1000)
          break
        case '7d':
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000)
          break
        case '1y':
          startDate = new Date(now - 365 * 24 * 60 * 60 * 1000)
          break
        case 'all':
          startDate = new Date(0) // Beginning of time
          break
        default:
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000) // Default to 7 days
      }
    }
    
    // If same currency, return simple data
    if (from === to) {
      return c.json({
        from,
        to,
        period,
        data: [{
          rate: 1,
          timestamp: Date.now(),
        }],
      })
    }
    
    // Handle direct USD pairs
    if (from === 'USD' || to === 'USD') {
      const currency = from === 'USD' ? to : from
      const isReverse = from === 'USD'
      
      const rates = await db
        .select({
          rate: currencyRates.rate,
          timestamp: currencyRates.updatedAt,
        })
        .from(currencyRates)
        .where(and(
          eq(currencyRates.fromCurrency, currency),
          eq(currencyRates.toCurrency, 'USD'),
          gte(currencyRates.updatedAt, startDate)
        ))
        .orderBy(desc(currencyRates.updatedAt))
        .all()
      
      const data: HistoricalRate[] = rates.map(r => ({
        rate: isReverse ? 1 / r.rate : r.rate,
        timestamp: r.timestamp ? new Date(r.timestamp).getTime() : Date.now(),
      }))
      
      return c.json({
        from,
        to,
        period,
        startDate: startDate.getTime(),
        data: data.reverse(), // Reverse to show chronologically
      })
    }
    
    // Handle cross-rates (e.g., EUR -> KZT)
    // Need to get both X->USD and Y->USD rates for the same time periods
    const fromRates = await db
      .select({
        rate: currencyRates.rate,
        timestamp: currencyRates.updatedAt,
      })
      .from(currencyRates)
      .where(and(
        eq(currencyRates.fromCurrency, from),
        eq(currencyRates.toCurrency, 'USD'),
        gte(currencyRates.updatedAt, startDate)
      ))
      .orderBy(desc(currencyRates.updatedAt))
      .all()
    
    const toRates = await db
      .select({
        rate: currencyRates.rate,
        timestamp: currencyRates.updatedAt,
      })
      .from(currencyRates)
      .where(and(
        eq(currencyRates.fromCurrency, to),
        eq(currencyRates.toCurrency, 'USD'),
        gte(currencyRates.updatedAt, startDate)
      ))
      .orderBy(desc(currencyRates.updatedAt))
      .all()
    
    // Match rates by timestamp (within 1 minute tolerance)
    const data: HistoricalRate[] = []
    
    for (const fromRate of fromRates) {
      const fromTime = fromRate.timestamp ? new Date(fromRate.timestamp).getTime() : 0
      
      // Find matching toRate within 1 minute
      const matchingToRate = toRates.find(toRate => {
        const toTime = toRate.timestamp ? new Date(toRate.timestamp).getTime() : 0
        return Math.abs(fromTime - toTime) < 60000 // 1 minute tolerance
      })
      
      if (matchingToRate) {
        data.push({
          rate: calculateCrossRate(fromRate.rate, matchingToRate.rate),
          timestamp: fromTime,
        })
      }
    }
    
    return c.json({
      from,
      to,
      period,
      startDate: startDate.getTime(),
      data: data.reverse(), // Reverse to show chronologically
    })
  } catch (error: any) {
    console.error('Error fetching currency history:', error)
    return c.json({ error: 'Failed to fetch currency history' }, 500)
  }
})
