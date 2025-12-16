import { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Grid,
  Fab,
} from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { useAuth } from '../hooks/useAuth'
import { WalletList } from './wallets/WalletList'
import { WalletForm } from './wallets/WalletForm'
import { EmailVerificationBanner } from './auth/EmailVerificationBanner'
import { TransactionList } from './transactions/TransactionList'
import { TransactionForm } from './transactions/TransactionForm'
import type { Wallet } from '../lib/api'

export function Dashboard() {
  const { currentUser, logout } = useAuth()
  const [walletFormOpen, setWalletFormOpen] = useState(false)
  const [transactionFormOpen, setTransactionFormOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  async function handleLogout() {
    try {
      await logout()
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  function handleAddWallet() {
    setEditingWallet(null)
    setWalletFormOpen(true)
  }

  function handleEditWallet(wallet: Wallet) {
    setEditingWallet(wallet)
    setWalletFormOpen(true)
  }

  function handleWalletFormSuccess() {
    setRefreshKey(prev => prev + 1)
  }

  function handleTransactionSuccess() {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            My Finance
          </Typography>
          <Typography sx={{ mr: 2 }}>
            {currentUser?.email}
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, pb: 10 }}>
        <EmailVerificationBanner />
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <WalletList
              key={refreshKey}
              onAddWallet={handleAddWallet}
              onEditWallet={handleEditWallet}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TransactionList refreshKey={refreshKey} />
          </Grid>
        </Grid>
      </Container>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setTransactionFormOpen(true)}
      >
        <AddIcon />
      </Fab>

      <WalletForm
        open={walletFormOpen}
        onClose={() => setWalletFormOpen(false)}
        onSuccess={handleWalletFormSuccess}
        wallet={editingWallet}
      />

      <TransactionForm
        open={transactionFormOpen}
        onClose={() => setTransactionFormOpen(false)}
        onSuccess={handleTransactionSuccess}
      />
    </Box>
  )
}

