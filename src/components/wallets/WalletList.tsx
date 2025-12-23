import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Grid,
  Chip,
  Alert,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountBalanceWallet,
  Savings,
  AccountBalance,
  CurrencyBitcoin,
} from '@mui/icons-material'
import { walletApi } from '../../lib/api'
import type { Wallet } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'

interface WalletListProps {
  onAddWallet: () => void
  onEditWallet: (wallet: Wallet) => void
}

const walletIcons = {
  wallet: AccountBalanceWallet,
  savings: Savings,
  bank_account: AccountBalance,
  crypto_wallet: CurrencyBitcoin,
}

const currencySymbols: Record<string, string> = {
  KZT: '₸',
  USD: '$',
  EUR: '€',
  BTC: '₿',
}

export function WalletList({ onAddWallet, onEditWallet }: WalletListProps) {
  const { getIdToken } = useAuth()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadWallets()
  }, [])

  async function loadWallets() {
    try {
      setError('')
      setLoading(true)
      const token = await getIdToken()
      if (!token) throw new Error('Not authenticated')
      
      const data = await walletApi.getAll(token)
      setWallets(data)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load wallets'
      // Don't show error if email verification is required
      if (!errorMessage.includes('verify your email')) {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleArchive(id: string) {
    const wallet = wallets.find(w => w.id === id)
    if (!wallet) return
    
    if (wallet.balance !== 0) {
      setError(`Cannot archive wallet with non-zero balance. Current balance: ${wallet.balance}`)
      return
    }
    
    if (!confirm(`Archive wallet "${wallet.name}"? You can restore it later.`)) return

    try {
      const token = await getIdToken()
      if (!token) throw new Error('Not authenticated')
      
      await walletApi.archive(token, id)
      setWallets(wallets.filter(w => w.id !== id))
    } catch (err: any) {
      setError(err.message || 'Failed to archive wallet')
    }
  }

  if (loading) {
    return <Typography>Loading wallets...</Typography>
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Wallets</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddWallet}
        >
          Add Wallet
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {wallets.length === 0 ? (
        <Card>
          <CardContent>
            <Typography align="center" color="text.secondary">
              No wallets yet. Create your first wallet to get started!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {wallets.map((wallet) => {
            const Icon = walletIcons[wallet.type] || AccountBalanceWallet
            const symbol = currencySymbols[wallet.currency] || wallet.currency
            
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={wallet.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Icon color="primary" />
                        <Typography variant="h6">{wallet.name}</Typography>
                      </Box>
                      <Box>
                        <IconButton size="small" onClick={() => onEditWallet(wallet)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleArchive(wallet.id)}
                          disabled={wallet.balance !== 0}
                          title={wallet.balance !== 0 ? 'Balance must be 0 to archive' : 'Archive wallet'}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    <Typography variant="h4" sx={{ mb: 1 }}>
                      {symbol}{wallet.balance.toFixed(2)}
                    </Typography>
                    
                    <Chip
                      label={wallet.currency}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}
    </Box>
  )
}

