import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { desc } from 'drizzle-orm'
import { currencyRates } from '../../db/schema'

type Bindings = {
  DB: D1Database
}

export const debugRoutes = new Hono<{ Bindings: Bindings }>()

// Get recent currency rates for debugging
debugRoutes.get('/recent-rates', async (c) => {
  const db = drizzle(c.env.DB)
  
  try {
    // Get last 20 records
    const recentRates = await db
      .select()
      .from(currencyRates)
      .orderBy(desc(currencyRates.id))
      .limit(20)
      .all()
    
    return c.json({
      total: recentRates.length,
      rates: recentRates,
    })
  } catch (error: any) {
    console.error('Error fetching recent rates:', error)
    return c.json({ error: error.message }, 500)
  }
})

// Get count of rates by currency pair
debugRoutes.get('/rates-count', async (c) => {
  const db = drizzle(c.env.DB)
  
  try {
    const allRates = await db
      .select()
      .from(currencyRates)
      .all()
    
    const counts: Record<string, number> = {}
    for (const rate of allRates) {
      const key = `${rate.fromCurrency}→${rate.toCurrency}`
      counts[key] = (counts[key] || 0) + 1
    }
    
    return c.json({
      totalRecords: allRates.length,
      byCurrencyPair: counts,
      oldestRecord: allRates.length > 0 ? allRates[allRates.length - 1] : null,
      newestRecord: allRates.length > 0 ? allRates[0] : null,
    })
  } catch (error: any) {
    console.error('Error counting rates:', error)
    return c.json({ error: error.message }, 500)
  }
})

