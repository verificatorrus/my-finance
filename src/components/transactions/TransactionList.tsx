import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
} from '@mui/material'
import {
  Delete as DeleteIcon,
  TrendingUp,
  TrendingDown,
  SwapHoriz,
} from '@mui/icons-material'
import { transactionApi, walletApi } from '../../lib/api'
import type { Transaction, Wallet } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'

interface TransactionListProps {
  refreshKey?: number
}

const currencySymbols: Record<string, string> = {
  KZT: '₸',
  USD: '$',
  EUR: '€',
  BTC: '₿',
}

export function TransactionList({ refreshKey = 0 }: TransactionListProps) {
  const { getIdToken } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [refreshKey])

  async function loadData() {
    try {
      setError('')
      setLoading(true)
      const token = await getIdToken()
      if (!token) throw new Error('Not authenticated')
      
      const [transactionsData, walletsData] = await Promise.all([
        transactionApi.getAll(token),
        walletApi.getAll(token),
      ])
      
      setTransactions(transactionsData)
      setWallets(walletsData)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load transactions'
      if (!errorMessage.includes('verify your email')) {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this transaction? This will reverse its effect on wallet balances.')) return

    try {
      const token = await getIdToken()
      if (!token) throw new Error('Not authenticated')
      
      await transactionApi.delete(token, id)
      setTransactions(transactions.filter(t => t.id !== id))
    } catch (err: any) {
      setError(err.message || 'Failed to delete transaction')
    }
  }

  function getWalletName(walletId: string | null): string {
    if (!walletId) return 'External'
    const wallet = wallets.find(w => w.id === walletId)
    return wallet ? wallet.name : 'Unknown'
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function getIcon(type: string) {
    switch (type) {
      case 'income':
        return <TrendingUp color="success" />
      case 'expense':
        return <TrendingDown color="error" />
      case 'transfer':
        return <SwapHoriz color="primary" />
      default:
        return null
    }
  }

  function getColor(type: string): 'success' | 'error' | 'primary' {
    switch (type) {
      case 'income':
        return 'success'
      case 'expense':
        return 'error'
      case 'transfer':
        return 'primary'
      default:
        return 'primary'
    }
  }

  if (loading) {
    return <Typography>Loading transactions...</Typography>
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Recent Transactions
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {transactions.length === 0 ? (
        <Card>
          <CardContent>
            <Typography align="center" color="text.secondary">
              No transactions yet. Create your first transaction!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <List>
            {transactions.map((transaction, index) => {
              const symbol = currencySymbols[transaction.currency] || transaction.currency
              
              return (
                <ListItem
                  key={transaction.id}
                  divider={index < transactions.length - 1}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleDelete(transaction.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <Box sx={{ mr: 2 }}>
                    {getIcon(transaction.type)}
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} component="div">
                        <Typography variant="body1" component="span">
                          {transaction.type === 'income' && `To ${getWalletName(transaction.toWalletId)}`}
                          {transaction.type === 'expense' && `From ${getWalletName(transaction.fromWalletId)}`}
                          {transaction.type === 'transfer' && 
                            `${getWalletName(transaction.fromWalletId)} → ${getWalletName(transaction.toWalletId)}`
                          }
                        </Typography>
                        <Chip 
                          label={transaction.category || transaction.type} 
                          size="small" 
                          color={getColor(transaction.type)}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box component="span">
                        <Typography variant="body2" color="text.secondary" component="span" display="block">
                          {transaction.description || formatDate(transaction.date)}
                        </Typography>
                        {transaction.description && (
                          <Typography variant="caption" color="text.secondary" component="span" display="block">
                            {formatDate(transaction.date)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Typography 
                    variant="h6" 
                    color={transaction.type === 'income' ? 'success.main' : transaction.type === 'expense' ? 'error.main' : 'primary.main'}
                    sx={{ ml: 2 }}
                  >
                    {transaction.type === 'income' && '+'}
                    {transaction.type === 'expense' && '-'}
                    {symbol}{transaction.amount.toFixed(2)}
                  </Typography>
                </ListItem>
              )
            })}
          </List>
        </Card>
      )}
    </Box>
  )
}

