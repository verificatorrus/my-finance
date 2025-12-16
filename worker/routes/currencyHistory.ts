import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc } from 'drizzle-orm'
import { currencyRates } from '../../db/schema'

type Bindings = {
  DB: D1Database
}

export const currencyHistoryRoutes = new Hono<{ Bindings: Bindings }>()

interface HistoricalRate {
  rate: number
  timestamp: number
}

// Get historical rates for a currency pair
currencyHistoryRoutes.get('/history/:from/:to', async (c) => {
  const from = c.req.param('from').toUpperCase()
  const to = c.req.param('to').toUpperCase()
  const hoursParam = c.req.query('hours') || '24'
  const hours = parseInt(hoursParam)
  
  if (from === to) {
    return c.json({ from, to, data: [] })
  }
  
  const db = drizzle(c.env.DB)
  
  try {
    // Get all historical rates for this pair
    // Since we update every 10 minutes, we'll have 6 records per hour
    // For now, we only store the latest rate (update in place)
    // In the future, we could add a separate table for historical snapshots
    
    // Query to get historical rates
    const rates = await db
      .select({
        rate: currencyRates.rate,
        timestamp: currencyRates.updatedAt,
      })
      .from(currencyRates)
      .where(and(
        eq(currencyRates.fromCurrency, from),
        eq(currencyRates.toCurrency, to)
      ))
      .orderBy(desc(currencyRates.updatedAt))
      .limit(1)
      .all()
    
    // For now, we only have the latest rate since we update in place
    // In the future, we could store historical snapshots
    const data: HistoricalRate[] = rates.map(r => ({
      rate: r.rate,
      timestamp: r.timestamp ? new Date(r.timestamp).getTime() : Date.now(),
    }))
    
    return c.json({
      from,
      to,
      hours,
      data,
    })
  } catch (error) {
    console.error('Error fetching currency history:', error)
    return c.json({ error: 'Failed to fetch currency history' }, 500)
  }
})

