import { useState, useEffect } from 'react'
import { Alert, Button, Box } from '@mui/material'
import { useAuth } from '../../hooks/useAuth'

export function EmailVerificationBanner() {
  const { currentUser, verifyEmail } = useAuth()
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  // Auto-refresh email verification status when window gains focus
  useEffect(() => {
    const handleFocus = async () => {
      if (currentUser && !currentUser.emailVerified) {
        try {
          await currentUser.reload()
        } catch (err) {
          console.error('Failed to reload user:', err)
        }
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [currentUser])

  if (!currentUser || currentUser.emailVerified) {
    return null
  }

  async function handleResend() {
    try {
      setSending(true)
      setMessage('')
      await verifyEmail()
      setMessage('Verification email sent! Please check your inbox.')
    } catch (err: any) {
      setMessage('Failed to send email. Please try again later.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Alert severity="warning" sx={{ mb: 1 }}>
        Please verify your email address to access all features.
      </Alert>
      {message && (
        <Alert severity={message.includes('sent') ? 'success' : 'error'} sx={{ mb: 1 }}>
          {message}
        </Alert>
      )}
      <Button
        variant="outlined"
        onClick={handleResend}
        disabled={sending}
        size="small"
      >
        {sending ? 'Sending...' : 'Resend Verification Email'}
      </Button>
    </Box>
  )
}

