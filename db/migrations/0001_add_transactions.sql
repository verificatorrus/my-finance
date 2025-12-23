-- Transactions table
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  from_wallet_id TEXT,
  to_wallet_id TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  category TEXT,
  description TEXT,
  date INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (from_wallet_id) REFERENCES wallets(id) ON DELETE SET NULL,
  FOREIGN KEY (to_wallet_id) REFERENCES wallets(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX transactions_user_id_idx ON transactions(user_id);
CREATE INDEX transactions_date_idx ON transactions(date);
CREATE INDEX transactions_from_wallet_idx ON transactions(from_wallet_id);
CREATE INDEX transactions_to_wallet_idx ON transactions(to_wallet_id);
CREATE INDEX transactions_type_idx ON transactions(type);

