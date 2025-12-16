import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { currencyRates } from '../../db/schema'

interface CoinMarketCapResponse {
  status: {
    timestamp: string
    error_code: number
    error_message: string | null
  }
  data: {
    BTC: {
      id: number
      name: string
      symbol: string
      quote: {
        [currency: string]: {
          price: number
          last_updated: string
        }
      }
    }
  }
}

interface CurrencyRate {
  fromCurrency: string
  toCurrency: string
  rate: number
}

/**
 * Fetch all currency prices in USD from CoinMarketCap API
 * We only need one API call to get BTC, EUR, and KZT prices in USD
 */
async function fetchUSDPrices(apiKey: string): Promise<{ [currency: string]: number }> {
  // Get BTC price in USD
  const btcUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC&convert=USD&CMC_PRO_API_KEY=${apiKey}`
  
  const btcResponse = await fetch(btcUrl, {
    headers: {
      'Accept': 'application/json',
    },
  })
  
  if (!btcResponse.ok) {
    throw new Error(`Failed to fetch BTC price: ${btcResponse.status}`)
  }
  
  const btcData: CoinMarketCapResponse = await btcResponse.json()
  
  if (btcData.status.error_code !== 0) {
    throw new Error(`CoinMarketCap API error: ${btcData.status.error_message}`)
  }
  
  const btcInUSD = btcData.data.BTC.quote.USD.price
  
  // For fiat currencies, we can use a free forex API or calculate from BTC
  // For now, let's use exchange rate API for EUR and KZT
  const eurResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
  
  if (!eurResponse.ok) {
    throw new Error(`Failed to fetch EUR/KZT rates: ${eurResponse.status}`)
  }
  
  const forexData = await eurResponse.json() as { rates: { EUR: number; KZT: number } }
  
  return {
    USD: 1, // USD to USD is always 1
    BTC: btcInUSD, // Price of BTC in USD
    EUR: forexData.rates.EUR, // USD to EUR rate
    KZT: forexData.rates.KZT, // USD to KZT rate
  }
}

/**
 * Calculate base rates to store in DB
 * We only store rates FROM other currencies TO USD (3 records total)
 * Reverse rates (USD to other currencies) are calculated as 1/rate on the fly
 */
function calculateBaseRates(usdPrices: { [currency: string]: number }): CurrencyRate[] {
  const rates: CurrencyRate[] = []
  
  // BTC: already in correct format (1 BTC = X USD)
  if (usdPrices.BTC) {
    rates.push({ 
      fromCurrency: 'BTC', 
      toCurrency: 'USD', 
      rate: usdPrices.BTC
    })
  }
  
  // EUR and KZT: forex API returns 1 USD = X EUR/KZT, so we need to invert
  if (usdPrices.EUR) {
    rates.push({ 
      fromCurrency: 'EUR', 
      toCurrency: 'USD', 
      rate: 1 / usdPrices.EUR  // Convert USD->EUR to EUR->USD
    })
  }
  
  if (usdPrices.KZT) {
    rates.push({ 
      fromCurrency: 'KZT', 
      toCurrency: 'USD', 
      rate: 1 / usdPrices.KZT  // Convert USD->KZT to KZT->USD
    })
  }
  
  return rates
}

/**
 * Update or insert currency rates in the database
 */
async function upsertCurrencyRate(
  db: ReturnType<typeof drizzle>,
  fromCurrency: string,
  toCurrency: string,
  rate: number
) {
  const existing = await db
    .select()
    .from(currencyRates)
    .where(and(
      eq(currencyRates.fromCurrency, fromCurrency),
      eq(currencyRates.toCurrency, toCurrency)
    ))
    .get()
  
  if (existing) {
    await db
      .update(currencyRates)
      .set({ rate, updatedAt: new Date() })
      .where(and(
        eq(currencyRates.fromCurrency, fromCurrency),
        eq(currencyRates.toCurrency, toCurrency)
      ))
  } else {
    await db.insert(currencyRates).values({
      fromCurrency,
      toCurrency,
      rate,
      updatedAt: new Date(),
    })
  }
}

/**
 * Main function to update all currency rates
 * Now we only store base rates (all currencies to/from USD)
 */
export async function updateCurrencyRates(db: D1Database, apiKey: string): Promise<void> {
  console.log('Starting currency rates update...')
  
  try {
    // Fetch all currency prices in USD
    const usdPrices = await fetchUSDPrices(apiKey)
    
    console.log(`Fetched USD prices:`, usdPrices)
    
    // Calculate base rates (only to/from USD)
    const rates = calculateBaseRates(usdPrices)
    
    console.log(`Calculated ${rates.length} base exchange rates`)
    
    // Save all rates to database
    const drizzleDb = drizzle(db)
    
    for (const rate of rates) {
      await upsertCurrencyRate(
        drizzleDb,
        rate.fromCurrency,
        rate.toCurrency,
        rate.rate
      )
    }
    
    console.log('Currency rates updated successfully')
  } catch (error) {
    console.error('Error updating currency rates:', error)
    throw error
  }
}

