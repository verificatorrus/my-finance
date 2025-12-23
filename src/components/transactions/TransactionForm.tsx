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
  Tabs,
  Tab,
} from '@mui/material'
import { walletApi, transactionApi } from '../../lib/api'
import type { Wallet } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'

interface TransactionFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const incomeCategories = ['Salary', 'Bonus', 'Gift', 'Investment', 'Other']
const expenseCategories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other']

export function TransactionForm({ open, onClose, onSuccess }: TransactionFormProps) {
  const { getIdToken } = useAuth()
  const [tab, setTab] = useState(0) // 0: income, 1: expense, 2: transfer
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [fromWalletId, setFromWalletId] = useState('')
  const [toWalletId, setToWalletId] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedFromWallet, setSelectedFromWallet] = useState<Wallet | null>(null)

  useEffect(() => {
    if (open) {
      loadWallets()
      setFromWalletId('')
      setToWalletId('')
      setAmount('')
      setCategory('')
      setDescription('')
      setError('')
      setSelectedFromWallet(null)
    }
  }, [open])

  async function loadWallets() {
    try {
      const token = await getIdToken()
      if (!token) return
      
      const data = await walletApi.getAll(token)
      setWallets(data)
      
      if (data.length > 0) {
        setFromWalletId(data[0].id)
        setToWalletId(data[0].id)
        setSelectedFromWallet(data[0])
      }
    } catch (err: any) {
      console.error('Failed to load wallets:', err)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setError('')
      setLoading(true)
      const token = await getIdToken()
      if (!token) throw new Error('Not authenticated')

      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Please enter a valid amount')
      }

      if (tab === 0) {
        // Income
        await transactionApi.createIncome(token, {
          toWalletId,
          amount: amountNum,
          category: category || 'Income',
          description,
        })
      } else if (tab === 1) {
        // Expense
        await transactionApi.createExpense(token, {
          fromWalletId,
          amount: amountNum,
          category: category || 'Expense',
          description,
        })
      } else {
        // Transfer
        if (fromWalletId === toWalletId) {
          throw new Error('Cannot transfer to the same wallet')
        }
        
        const fromWallet = wallets.find(w => w.id === fromWalletId)
        const toWallet = wallets.find(w => w.id === toWalletId)
        
        if (fromWallet && toWallet && fromWallet.currency !== toWallet.currency) {
          throw new Error('Cannot transfer between wallets with different currencies. Use expense/income instead.')
        }
        
        await transactionApi.createTransfer(token, {
          fromWalletId,
          toWalletId,
          amount: amountNum,
          description,
        })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create transaction')
    } finally {
      setLoading(false)
    }
  }

  const categories = tab === 0 ? incomeCategories : expenseCategories

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>New Transaction</DialogTitle>
        <DialogContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Income" />
            <Tab label="Expense" />
            <Tab label="Transfer" />
          </Tabs>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {tab === 0 && (
            // Income
            <>
              <TextField
                margin="normal"
                required
                fullWidth
                select
                label="To Wallet"
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
              >
                {wallets.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name} ({w.currency})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                margin="normal"
                required
                fullWidth
                label="Amount"
                type="number"
                inputProps={{ step: '0.01', min: '0.01' }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <TextField
                margin="normal"
                fullWidth
                select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}

          {tab === 1 && (
            // Expense
            <>
              <TextField
                margin="normal"
                required
                fullWidth
                select
                label="From Wallet"
                value={fromWalletId}
                onChange={(e) => setFromWalletId(e.target.value)}
              >
                {wallets.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name} ({w.currency})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                margin="normal"
                required
                fullWidth
                label="Amount"
                type="number"
                inputProps={{ step: '0.01', min: '0.01' }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <TextField
                margin="normal"
                fullWidth
                select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}

          {tab === 2 && (
            // Transfer
            <>
              <TextField
                margin="normal"
                required
                fullWidth
                select
                label="From Wallet"
                value={fromWalletId}
                onChange={(e) => {
                  const wallet = wallets.find(w => w.id === e.target.value)
                  setFromWalletId(e.target.value)
                  setSelectedFromWallet(wallet || null)
                  // Auto-select first wallet with same currency
                  const sameCurrencyWallet = wallets.find(w => 
                    w.id !== e.target.value && w.currency === wallet?.currency
                  )
                  if (sameCurrencyWallet) {
                    setToWalletId(sameCurrencyWallet.id)
                  }
                }}
              >
                {wallets.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name} ({w.currency})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                margin="normal"
                required
                fullWidth
                select
                label="To Wallet"
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
              >
                {wallets
                  .filter(w => w.id !== fromWalletId && w.currency === selectedFromWallet?.currency)
                  .map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name} ({w.currency})
                    </MenuItem>
                  ))}
              </TextField>

              {selectedFromWallet && wallets.filter(w => 
                w.id !== fromWalletId && w.currency === selectedFromWallet.currency
              ).length === 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  No other wallets with {selectedFromWallet.currency} currency. 
                  Create another {selectedFromWallet.currency} wallet or use expense/income for currency exchange.
                </Alert>
              )}

              <TextField
                margin="normal"
                required
                fullWidth
                label="Amount"
                type="number"
                inputProps={{ step: '0.01', min: '0.01' }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </>
          )}

          <TextField
            margin="normal"
            fullWidth
            label="Description (optional)"
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading || wallets.length === 0}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

