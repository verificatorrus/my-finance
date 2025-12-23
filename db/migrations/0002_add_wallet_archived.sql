-- Add archived field to wallets table
ALTER TABLE wallets ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;

-- Create index for faster queries on archived wallets
CREATE INDEX wallets_archived_idx ON wallets(archived);

