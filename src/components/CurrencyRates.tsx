import { useState, useEffect } from 'react'
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useAuth } from '../hooks/useAuth'

interface CurrencyRate {
  from: string
  to: string
  rate: number
  cached?: boolean
}

const currencies = [
  { code: 'BTC', name: 'Bitcoin', symbol: '₿' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
]

export function CurrencyRates() {
  const { getIdToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rates, setRates] = useState<Record<string, CurrencyRate>>({})
  const [fromCurrency, setFromCurrency] = useState('BTC')
  const [toCurrency, setToCurrency] = useState('USD')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [currentRate, setCurrentRate] = useState<number | null>(null)

  useEffect(() => {
    loadRates()
    // Update all rates every minute
    const interval = setInterval(() => {
      loadRates()
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadCurrentRate()
  }, [fromCurrency, toCurrency])

  // Separate effect to update current rate every minute
  useEffect(() => {
    const interval = setInterval(() => {
      loadCurrentRate()
    }, 60000)
    return () => clearInterval(interval)
  }, [fromCurrency, toCurrency]) // Now depends on currency selection

  async function loadCurrentRate() {
    if (fromCurrency === toCurrency) {
      setCurrentRate(1)
      setLastUpdate(new Date())
      return
    }

    try {
      const token = await getIdToken()
      if (!token) return

      const response = await fetch(
        `/api/currency/rate/${fromCurrency}/${toCurrency}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setCurrentRate(data.rate)
        setLastUpdate(new Date())
      }
    } catch (err: any) {
      console.error('Failed to load current rate:', err)
    }
  }

  async function loadRates() {
    try {
      setError('')
      const token = await getIdToken()
      if (!token) throw new Error('Not authenticated')

      const ratesData: Record<string, CurrencyRate> = {}

      // Fetch all currency pairs
      for (const fromCurr of currencies) {
        for (const toCurr of currencies) {
          if (fromCurr.code === toCurr.code) continue

          const response = await fetch(
            `/api/currency/rate/${fromCurr.code}/${toCurr.code}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )

          if (response.ok) {
            const data = await response.json()
            ratesData[`${fromCurr.code}-${toCurr.code}`] = data
          }
        }
      }

      setRates(ratesData)
      // Don't update lastUpdate here to avoid race condition with loadCurrentRate()
    } catch (err: any) {
      setError(err.message || 'Failed to load currency rates')
    } finally {
      setLoading(false)
    }
  }

  function getRate(from: string, to: string): number | null {
    const key = `${from}-${to}`
    return rates[key]?.rate ?? null
  }

  function formatRate(rate: number | null): string {
    if (rate === null) return 'N/A'
    if (rate < 0.01) return rate.toFixed(8)
    if (rate < 1) return rate.toFixed(6)
    if (rate < 100) return rate.toFixed(4)
    return rate.toFixed(2)
  }

  // Prepare data for chart - show selected currency pair as a single point
  const chartData = currentRate !== null ? [{
    name: 'Current',
    rate: currentRate,
    timestamp: lastUpdate?.getTime() || Date.now(),
  }] : []

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Currency Exchange Rates
        </Typography>
        {lastUpdate && (
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Current Rate Display */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Current Exchange Rate</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>From Currency</InputLabel>
                <Select
                  value={fromCurrency}
                  label="From Currency"
                  onChange={(e) => setFromCurrency(e.target.value)}
                >
                  {currencies.map((currency) => (
                    <MenuItem key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name} ({currency.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>To Currency</InputLabel>
                <Select
                  value={toCurrency}
                  label="To Currency"
                  onChange={(e) => setToCurrency(e.target.value)}
                >
                  {currencies
                    .filter(c => c.code !== fromCurrency)
                    .map((currency) => (
                      <MenuItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name} ({currency.code})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {currentRate !== null && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h3" color="primary" gutterBottom>
              {formatRate(currentRate)}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              1 {fromCurrency} = {formatRate(currentRate)} {toCurrency}
            </Typography>
          </Box>
        )}

        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp"
                tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
              />
              <YAxis 
                tickFormatter={(value) => formatRate(value)}
              />
              <Tooltip 
                formatter={(value: number | undefined) => value !== undefined ? formatRate(value) : 'N/A'}
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#1976d2"
                strokeWidth={3}
                dot={{ r: 6 }}
                name={`${fromCurrency}/${toCurrency}`}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>

      {/* Currency Pairs Grid */}
      <Typography variant="h6" gutterBottom>
        All Currency Pairs
      </Typography>
      <Grid container spacing={2}>
        {currencies.map((fromCurrency) => (
          currencies.map((toCurrency) => {
            if (fromCurrency.code === toCurrency.code) return null

            const rate = getRate(fromCurrency.code, toCurrency.code)
            const rateData = rates[`${fromCurrency.code}-${toCurrency.code}`]

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`${fromCurrency.code}-${toCurrency.code}`}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" color="primary">
                        {fromCurrency.code} → {toCurrency.code}
                      </Typography>
                      {rateData?.cached && (
                        <Typography variant="caption" color="text.secondary">
                          Cached
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="h5" sx={{ mb: 1 }}>
                      {formatRate(rate)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      1 {fromCurrency.symbol} = {formatRate(rate)} {toCurrency.symbol}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )
          })
        ))}
      </Grid>

      {/* Info Box */}
      <Alert severity="info" sx={{ mt: 4 }}>
        Currency rates are automatically updated every minute using CoinMarketCap API. 
        All historical data is preserved for tracking. BTC is used as an intermediary to calculate cross-rates between fiat currencies.
      </Alert>
    </Container>
  )
}

