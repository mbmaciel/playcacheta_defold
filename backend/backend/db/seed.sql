-- Play Cacheta - Seed de dados iniciais
-- Execute: psql -U postgres -d playcacheta -f db/seed.sql

-- Limpa dados existentes
TRUNCATE packages RESTART IDENTITY CASCADE;

-- Garante que o usuário administrador possa ser recriado com as credenciais esperadas
DELETE FROM users
WHERE cpf = '000.000.000-00'
   OR email IN ('admin@playcacheta.com', 'teste@playcacheta.com');

-- Pacotes de fichas
INSERT INTO packages (label, fichas, bonus, price, sort_order, tag) VALUES
  ('50 Fichas',      50,    0,   2.00, 1, NULL),
  ('100 Fichas',    100,    0,   3.50, 2, NULL),
  ('250 Fichas',    250,    0,   7.50, 3, NULL),
  ('500 Fichas',    500,   50,  13.00, 4, 'POPULAR'),
  ('1.000 Fichas', 1000,  150,  22.00, 5, 'MAIS VENDIDO'),
  ('5.000 Fichas', 5000, 1000,  90.00, 6, 'MELHOR VALOR');

-- Usuário administrador do sistema (login/CPF: 00000000000, senha: 123456)
INSERT INTO users (name, cpf, email, phone, password_hash, fichas) VALUES
  (
    'Administrador',
    '000.000.000-00',
    'admin@playcacheta.com',
    '(11) 99999-0000',
    '$2a$10$URysv7ollo6DUZBHqD84Y.IE2j7bOXwFF/rRwC7dkRd/KiFIvE3RS', -- 123456
    350
  );
