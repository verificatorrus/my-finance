import { useState } from 'react'
import { AuthProvider } from './contexts/auth'
import { useAuth } from './hooks/useAuth'
import { Login } from './components/auth/Login'
import { SignUp } from './components/auth/SignUp'
import { ForgotPassword } from './components/auth/ForgotPassword'
import { Dashboard } from './components/Dashboard'
import { Box, CircularProgress } from '@mui/material'

type AuthView = 'login' | 'signup' | 'forgot-password'

function AuthFlow() {
  const [view, setView] = useState<AuthView>('login')

  switch (view) {
    case 'signup':
      return <SignUp onSwitchToLogin={() => setView('login')} />
    case 'forgot-password':
      return <ForgotPassword onSwitchToLogin={() => setView('login')} />
    default:
      return (
        <Login
          onSwitchToSignUp={() => setView('signup')}
          onSwitchToForgotPassword={() => setView('forgot-password')}
        />
      )
  }
}

function AppContent() {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return currentUser ? <Dashboard /> : <AuthFlow />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
