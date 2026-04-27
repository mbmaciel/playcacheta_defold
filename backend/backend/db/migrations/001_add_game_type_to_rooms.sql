-- Migration 001: adicionar game_type à tabela game_rooms
-- Executar: psql -U <user> -d <database> -f db/migrations/001_add_game_type_to_rooms.sql
--
-- Idempotente: seguro rodar mais de uma vez.

BEGIN;

-- Adiciona a coluna somente se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'game_rooms'
          AND column_name = 'game_type'
    ) THEN
        ALTER TABLE game_rooms
            ADD COLUMN game_type VARCHAR(20) NOT NULL DEFAULT 'truco_paulista';

        RAISE NOTICE 'Coluna game_type adicionada à tabela game_rooms.';
    ELSE
        RAISE NOTICE 'Coluna game_type já existe — nenhuma alteração feita.';
    END IF;
END;
$$;

-- Adiciona a constraint somente se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name       = 'game_rooms'
          AND constraint_name  = 'chk_game_type'
    ) THEN
        ALTER TABLE game_rooms
            ADD CONSTRAINT chk_game_type
                CHECK (game_type IN ('truco_paulista', 'cacheta', 'cachetao'));

        RAISE NOTICE 'Constraint chk_game_type adicionada.';
    ELSE
        RAISE NOTICE 'Constraint chk_game_type já existe — nenhuma alteração feita.';
    END IF;
END;
$$;

-- Preenche retroativamente linhas antigas sem valor explícito (só por segurança)
UPDATE game_rooms
   SET game_type = 'truco_paulista'
 WHERE game_type IS NULL OR game_type = '';

COMMIT;
