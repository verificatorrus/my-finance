import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { AuthContext } from './context'
import type { AuthContextType } from './types'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function signup(email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    // Send verification email
    if (userCredential.user) {
      await sendEmailVerification(userCredential.user)
    }
  }

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function logout() {
    await signOut(auth)
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email)
  }

  async function verifyEmail() {
    if (currentUser) {
      await sendEmailVerification(currentUser)
    }
  }

  async function getIdToken() {
    if (currentUser) {
      return await currentUser.getIdToken()
    }
    return undefined
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value: AuthContextType = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    verifyEmail,
    getIdToken,
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}

