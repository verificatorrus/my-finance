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
 * Fetch BTC price in specified currency from CoinMarketCap API
 */
async function fetchBTCPrice(currency: string, apiKey: string): Promise<number> {
  const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC&convert=${currency}&CMC_PRO_API_KEY=${apiKey}`
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch BTC price for ${currency}: ${response.status}`)
  }
  
  const data: CoinMarketCapResponse = await response.json()
  
  if (data.status.error_code !== 0) {
    throw new Error(`CoinMarketCap API error: ${data.status.error_message}`)
  }
  
  return data.data.BTC.quote[currency].price
}

/**
 * Calculate all currency exchange rates based on BTC prices
 * We get BTC prices in KZT, EUR, and USD, then calculate cross-rates
 */
function calculateCrossRates(btcPrices: { [currency: string]: number }): CurrencyRate[] {
  const currencies = ['BTC', 'USD', 'EUR', 'KZT']
  const rates: CurrencyRate[] = []
  
  // Add BTC to fiat rates (BTC -> USD, BTC -> EUR, BTC -> KZT)
  rates.push({ fromCurrency: 'BTC', toCurrency: 'USD', rate: btcPrices.USD })
  rates.push({ fromCurrency: 'BTC', toCurrency: 'EUR', rate: btcPrices.EUR })
  rates.push({ fromCurrency: 'BTC', toCurrency: 'KZT', rate: btcPrices.KZT })
  
  // Calculate fiat to BTC rates (USD -> BTC, EUR -> BTC, KZT -> BTC)
  rates.push({ fromCurrency: 'USD', toCurrency: 'BTC', rate: 1 / btcPrices.USD })
  rates.push({ fromCurrency: 'EUR', toCurrency: 'BTC', rate: 1 / btcPrices.EUR })
  rates.push({ fromCurrency: 'KZT', toCurrency: 'BTC', rate: 1 / btcPrices.KZT })
  
  // Calculate fiat cross-rates using BTC as intermediary
  // For example: USD -> EUR = (USD -> BTC) * (BTC -> EUR)
  
  // USD to other fiats
  rates.push({ fromCurrency: 'USD', toCurrency: 'EUR', rate: btcPrices.EUR / btcPrices.USD })
  rates.push({ fromCurrency: 'USD', toCurrency: 'KZT', rate: btcPrices.KZT / btcPrices.USD })
  
  // EUR to other fiats
  rates.push({ fromCurrency: 'EUR', toCurrency: 'USD', rate: btcPrices.USD / btcPrices.EUR })
  rates.push({ fromCurrency: 'EUR', toCurrency: 'KZT', rate: btcPrices.KZT / btcPrices.EUR })
  
  // KZT to other fiats
  rates.push({ fromCurrency: 'KZT', toCurrency: 'USD', rate: btcPrices.USD / btcPrices.KZT })
  rates.push({ fromCurrency: 'KZT', toCurrency: 'EUR', rate: btcPrices.EUR / btcPrices.KZT })
  
  // Add same currency rates (1:1)
  for (const currency of currencies) {
    rates.push({ fromCurrency: currency, toCurrency: currency, rate: 1 })
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
 */
export async function updateCurrencyRates(db: D1Database, apiKey: string): Promise<void> {
  console.log('Starting currency rates update...')
  
  try {
    // Fetch BTC prices in all target currencies
    const [btcInUSD, btcInEUR, btcInKZT] = await Promise.all([
      fetchBTCPrice('USD', apiKey),
      fetchBTCPrice('EUR', apiKey),
      fetchBTCPrice('KZT', apiKey),
    ])
    
    console.log(`Fetched BTC prices: USD=${btcInUSD}, EUR=${btcInEUR}, KZT=${btcInKZT}`)
    
    // Calculate all cross-rates
    const btcPrices = {
      USD: btcInUSD,
      EUR: btcInEUR,
      KZT: btcInKZT,
    }
    
    const rates = calculateCrossRates(btcPrices)
    
    console.log(`Calculated ${rates.length} exchange rates`)
    
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

