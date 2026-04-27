-- Play Cacheta - Schema PostgreSQL
-- Execute: psql -U postgres -d playcacheta -f db/schema.sql

-- Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Remove tabelas antigas (ordem reversa de dependência)
DROP TABLE IF EXISTS game_history CASCADE;
DROP TABLE IF EXISTS room_players CASCADE;
DROP TABLE IF EXISTS game_rooms CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USUÁRIOS
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  cpf           VARCHAR(14)  UNIQUE NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  fichas        INTEGER      NOT NULL DEFAULT 50,   -- 50 fichas de bônus no cadastro
  total_spent   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  wins          INTEGER      NOT NULL DEFAULT 0,
  losses        INTEGER      NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_cpf   ON users(cpf);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- PACOTES DE FICHAS
-- ============================================================
CREATE TABLE packages (
  id          SERIAL PRIMARY KEY,
  label       VARCHAR(50)   NOT NULL,
  fichas      INTEGER       NOT NULL,
  bonus       INTEGER       NOT NULL DEFAULT 0,
  price       DECIMAL(10,2) NOT NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  sort_order  INTEGER       NOT NULL DEFAULT 0,
  tag         VARCHAR(30),            -- 'POPULAR', 'MAIS VENDIDO', etc.
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRANSAÇÕES DE PAGAMENTO
-- ============================================================
CREATE TABLE transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id     INTEGER       REFERENCES packages(id),
  fichas_amount  INTEGER       NOT NULL,
  bonus_amount   INTEGER       NOT NULL DEFAULT 0,
  value          DECIMAL(10,2) NOT NULL,
  status         VARCHAR(20)   NOT NULL DEFAULT 'pending',
  pix_txid       VARCHAR(255),
  pix_payload    TEXT,
  trio_qrcode_id VARCHAR(255),
  trio_document_id VARCHAR(255),
  trio_external_id VARCHAR(255),
  trio_status    VARCHAR(50),
  trio_receipt_url TEXT,
  confirmed_at   TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ   NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_status CHECK (status IN ('pending','confirmed','cancelled','expired'))
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status  ON transactions(status);

-- ============================================================
-- SALAS DE JOGO
-- ============================================================
CREATE TABLE game_rooms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             VARCHAR(6)   UNIQUE NOT NULL,
  name             VARCHAR(100),
  status           VARCHAR(20)  NOT NULL DEFAULT 'waiting',
  max_players      SMALLINT     NOT NULL DEFAULT 4,
  fichas_per_round INTEGER      NOT NULL DEFAULT 5,
  is_private       BOOLEAN      NOT NULL DEFAULT false,
  password_hash    VARCHAR(255),
  created_by       UUID         REFERENCES users(id),
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  winner_team      SMALLINT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_room_status CHECK (status IN ('waiting','playing','finished'))
);

CREATE INDEX idx_game_rooms_status ON game_rooms(status);
CREATE INDEX idx_game_rooms_code   ON game_rooms(code);

-- ============================================================
-- JOGADORES NA SALA
-- ============================================================
CREATE TABLE room_players (
  id        UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   UUID     NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id   UUID     NOT NULL REFERENCES users(id),
  team      SMALLINT,          -- 0 ou 1
  position  SMALLINT,          -- 0 a 3
  score     INTEGER  NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at   TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_room_players_active_user
  ON room_players (room_id, user_id)
  WHERE left_at IS NULL;

CREATE UNIQUE INDEX idx_room_players_active_position
  ON room_players (room_id, position)
  WHERE left_at IS NULL;

-- ============================================================
-- HISTÓRICO DE PARTIDAS
-- ============================================================
CREATE TABLE game_history (
  id              UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID     NOT NULL REFERENCES game_rooms(id),
  winner_team     SMALLINT,
  final_scores    JSONB,   -- {"team0": 12, "team1": 8}
  rounds_played   INTEGER,
  duration_secs   INTEGER,
  players_data    JSONB,   -- snapshot dos jogadores
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUNÇÃO: atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
