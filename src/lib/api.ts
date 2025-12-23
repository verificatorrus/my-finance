const API_BASE_URL = '/api'

interface ApiOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
  token?: string
}

async function fetchApi<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, token } = options

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
  }

  if (body) {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// User API
export const userApi = {
  getProfile: (token: string) =>
    fetchApi('/user/profile', { token }),
  
  updateProfile: (token: string, data: { defaultCurrency: string }) =>
    fetchApi('/user/profile', {
      method: 'PUT',
      token,
      body: data,
    }),
}

// Wallet API
export type Wallet = {
  id: string
  userId: string
  name: string
  type: 'wallet' | 'savings' | 'bank_account' | 'crypto_wallet'
  currency: 'KZT' | 'USD' | 'EUR' | 'BTC'
  balance: number
  icon?: string | null
  archived: boolean
  createdAt: Date
  updatedAt: Date
}

export const walletApi = {
  getAll: (token: string, includeArchived = false) =>
    fetchApi<Wallet[]>(`/wallets${includeArchived ? '?includeArchived=true' : ''}`, { token }),
  
  getById: (token: string, id: string) =>
    fetchApi<Wallet>(`/wallets/${id}`, { token }),
  
  create: (token: string, data: {
    name: string
    type: string
    currency: string
    icon?: string
  }) =>
    fetchApi<Wallet>('/wallets', {
      method: 'POST',
      token,
      body: data,
    }),
  
  update: (token: string, id: string, data: Partial<Wallet>) =>
    fetchApi<Wallet>(`/wallets/${id}`, {
      method: 'PUT',
      token,
      body: data,
    }),
  
  archive: (token: string, id: string) =>
    fetchApi<{ success: boolean; archived: boolean }>(`/wallets/${id}`, {
      method: 'DELETE',
      token,
    }),
  
  unarchive: (token: string, id: string) =>
    fetchApi<{ success: boolean; archived: boolean }>(`/wallets/${id}/unarchive`, {
      method: 'POST',
      token,
    }),
}

// Currency API
export type CurrencyRate = {
  from: string
  to: string
  rate: number
  cached?: boolean
  stale?: boolean
}

export type CurrencyConversion = CurrencyRate & {
  amount: number
  converted: number
}

export type Currency = {
  code: string
  name: string
  symbol: string
}

export const currencyApi = {
  getRate: (from: string, to: string) =>
    fetchApi<CurrencyRate>(`/currency/rate/${from}/${to}`),
  
  convert: (from: string, to: string, amount: number) =>
    fetchApi<CurrencyConversion>(`/currency/convert/${from}/${to}/${amount}`),
  
  getSupportedCurrencies: () =>
    fetchApi<{ currencies: Currency[] }>('/currency/supported'),
}

// Transaction API
export type Transaction = {
  id: string
  userId: string
  type: 'income' | 'expense' | 'transfer'
  fromWalletId: string | null
  toWalletId: string | null
  amount: number
  currency: string
  category: string | null
  description: string | null
  date: Date
  createdAt: Date
}

export const transactionApi = {
  getAll: (token: string) =>
    fetchApi<Transaction[]>('/transactions', { token }),
  
  getByWallet: (token: string, walletId: string) =>
    fetchApi<Transaction[]>(`/transactions/wallet/${walletId}`, { token }),
  
  createIncome: (token: string, data: {
    toWalletId: string
    amount: number
    category?: string
    description?: string
    date?: string
  }) =>
    fetchApi<Transaction>('/transactions/income', {
      method: 'POST',
      token,
      body: data,
    }),
  
  createExpense: (token: string, data: {
    fromWalletId: string
    amount: number
    category?: string
    description?: string
    date?: string
  }) =>
    fetchApi<Transaction>('/transactions/expense', {
      method: 'POST',
      token,
      body: data,
    }),
  
  createTransfer: (token: string, data: {
    fromWalletId: string
    toWalletId: string
    amount: number
    description?: string
    date?: string
  }) =>
    fetchApi<Transaction>('/transactions/transfer', {
      method: 'POST',
      token,
      body: data,
    }),
  
  delete: (token: string, id: string) =>
    fetchApi<{ success: boolean }>(`/transactions/${id}`, {
      method: 'DELETE',
      token,
    }),
}

