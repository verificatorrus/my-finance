import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Alert,
} from '@mui/material'
import { walletApi } from '../../lib/api'
import type { Wallet } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'

interface WalletFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  wallet?: Wallet | null
}

const walletTypes = [
  { value: 'wallet', label: 'Wallet' },
  { value: 'savings', label: 'Savings' },
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'crypto_wallet', label: 'Crypto Wallet' },
]

const currencies = [
  { value: 'KZT', label: 'KZT - Kazakhstani Tenge' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'BTC', label: 'BTC - Bitcoin' },
]

export function WalletForm({ open, onClose, onSuccess, wallet }: WalletFormProps) {
  const { getIdToken } = useAuth()
  const [name, setName] = useState('')
  const [type, setType] = useState('wallet')
  const [currency, setCurrency] = useState('USD')
  const [initialBalance, setInitialBalance] = useState('0')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (wallet) {
      setName(wallet.name)
      setType(wallet.type)
      setCurrency(wallet.currency)
      // Don't allow editing balance - it's managed by transactions
    } else {
      setName('')
      setType('wallet')
      setCurrency('USD')
      setInitialBalance('0')
    }
    setError('')
  }, [wallet, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setError('')
      setLoading(true)
      const token = await getIdToken()
      if (!token) throw new Error('Not authenticated')

      if (wallet) {
        // Update existing wallet (no balance field)
        await walletApi.update(token, wallet.id, { 
          name, 
          type: type as 'wallet' | 'savings' | 'bank_account' | 'crypto_wallet', 
          currency: currency as 'KZT' | 'USD' | 'EUR' | 'BTC'
        })
      } else {
        // Create new wallet
        const newWallet = await walletApi.create(token, {
          name,
          type,
          currency,
        })
        
        // If initial balance > 0, create an income transaction
        const initialBalanceNum = parseFloat(initialBalance)
        if (initialBalanceNum > 0) {
          const { transactionApi } = await import('../../lib/api')
          await transactionApi.createIncome(token, {
            toWalletId: newWallet.id,
            amount: initialBalanceNum,
            category: 'Initial Balance',
            description: 'Initial balance when creating wallet',
          })
        }
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save wallet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{wallet ? 'Edit Wallet' : 'Add New Wallet'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            margin="normal"
            required
            fullWidth
            label="Wallet Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <TextField
            margin="normal"
            required
            fullWidth
            select
            label="Wallet Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {walletTypes.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            margin="normal"
            required
            fullWidth
            select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {currencies.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          {!wallet && (
            <TextField
              margin="normal"
              fullWidth
              label="Initial Balance (optional)"
              type="number"
              inputProps={{ step: '0.01', min: '0' }}
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              helperText="Will create an 'Initial Balance' transaction if > 0"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

