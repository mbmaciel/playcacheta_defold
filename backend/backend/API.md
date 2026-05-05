# Play Cacheta — Documentação da API

Servidor: `http://localhost:3001` (dev) · `https://api.playcacheta.online` (produção)

---

## Autenticação

A maioria dos endpoints exige um JWT no header:

```
Authorization: Bearer <token>
```

O token é retornado nos endpoints de login e cadastro. Expira em **7 dias**.

---

## Formato de erro

Todas as respostas de erro seguem o mesmo formato:

```json
{ "error": "Descrição do problema." }
```

---

## Endpoints REST

### POST `/auth/register` — Cadastro

Cria uma nova conta. O usuário recebe **50 fichas de bônus**.

**Body:**

| Campo      | Tipo   | Obrigatório | Descrição                        |
|------------|--------|-------------|----------------------------------|
| `name`     | string | sim         | Nome completo                    |
| `cpf`      | string | sim         | CPF (com ou sem formatação)      |
| `email`    | string | sim         | E-mail válido                    |
| `password` | string | sim         | Mínimo 6 caracteres              |
| `phone`    | string | não         | Telefone opcional                |

**Resposta 201:**

```json
{
  "message": "Conta criada com sucesso! Você ganhou 50 fichas de bônus.",
  "token": "<jwt>",
  "user": {
    "id": 1,
    "name": "João Silva",
    "cpf": "123.456.789-00",
    "email": "joao@email.com",
    "phone": null,
    "fichas": 50,
    "wins": 0,
    "losses": 0,
    "created_at": "2026-04-07T12:00:00.000Z"
  }
}
```

**Erros:** `400` campos inválidos · `409` CPF ou e-mail já cadastrado

---

### POST `/auth/login` — Login

**Body:**

| Campo      | Tipo   | Descrição               |
|------------|--------|-------------------------|
| `cpf`      | string | CPF (qualquer formato)  |
| `password` | string | Senha da conta          |

**Resposta 200:**

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "name": "João Silva",
    "cpf": "123.456.789-00",
    "email": "joao@email.com",
    "phone": null,
    "fichas": 120,
    "wins": 5,
    "losses": 2
  }
}
```

**Erros:** `400` campos faltando · `401` CPF/senha incorretos ou conta desativada

---

### GET `/users/me` — Perfil do usuário logado

🔒 Requer autenticação.

**Resposta 200:**

```json
{
  "user": {
    "id": 1,
    "name": "João Silva",
    "cpf": "123.456.789-00",
    "email": "joao@email.com",
    "phone": "(11) 99999-0000",
    "fichas": 120,
    "wins": 5,
    "losses": 2
  }
}
```

---

### GET `/users` — Listar usuários

🔒 Requer autenticação de administrador.

Somente o usuário com CPF `000.000.000-00` pode acessar.

**Resposta 200:**

```json
{
  "users": [
    {
      "id": "uuid",
      "name": "João Silva",
      "cpf": "123.456.789-00",
      "email": "joao@email.com",
      "phone": "(11) 99999-0000",
      "fichas": 120,
      "total_spent": "0.00",
      "wins": 5,
      "losses": 2,
      "is_active": true,
      "created_at": "2026-04-07T12:00:00.000Z"
    }
  ]
}
```

**Erros:** `403` acesso restrito ao administrador

---

### PUT `/users/me` — Atualizar perfil

🔒 Requer autenticação.

**Body (todos opcionais — só envia o que quer alterar):**

| Campo   | Tipo   | Descrição        |
|---------|--------|------------------|
| `name`  | string | Novo nome        |
| `email` | string | Novo e-mail      |
| `phone` | string | Novo telefone    |

**Resposta 200:** objeto `user` atualizado

**Erros:** `400` nome/e-mail inválido · `409` e-mail já em uso

---

### PUT `/users/me/password` — Alterar senha

🔒 Requer autenticação.

**Body:**

| Campo             | Tipo   | Descrição      |
|-------------------|--------|----------------|
| `currentPassword` | string | Senha atual    |
| `newPassword`     | string | Nova senha (mín. 6 chars) |

**Resposta 200:** `{ "message": "Senha alterada com sucesso." }`

**Erros:** `400` campos inválidos · `401` senha atual incorreta

---

### GET `/packages` — Listar pacotes de fichas

Público — não requer autenticação.

**Resposta 200:**

```json
{
  "packages": [
    {
      "id": 1,
      "label": "Iniciante",
      "fichas": 100,
      "bonus": 0,
      "price": "5.00",
      "tag": null
    },
    {
      "id": 2,
      "label": "Popular",
      "fichas": 300,
      "bonus": 50,
      "price": "10.00",
      "tag": "Mais vendido"
    }
  ]
}
```

---

### GET `/game/rooms` — Listar salas disponíveis

🔒 Requer autenticação.

Retorna até 20 salas públicas com status `waiting` que ainda têm vagas.

**Resposta 200:**

```json
{
  "rooms": [
    {
      "id": "uuid",
      "code": "AB12CD",
      "name": "Sala do João",
      "status": "waiting",
      "fichas_per_round": 5,
      "max_players": 4,
      "is_private": false,
      "players_count": 2
    }
  ]
}
```

---

### GET `/game/rooms/manage` — Listagem administrativa de salas

🔒 Requer autenticação de administrador.

Retorna salas públicas e privadas para administração, incluindo status `waiting`, `playing` e `finished`.

**Resposta 200:**

```json
{
  "rooms": [
    {
      "id": "uuid",
      "code": "AB12CD",
      "name": "Sala do João",
      "status": "waiting",
      "game_type": "truco_paulista",
      "fichas_per_round": 5,
      "max_players": 4,
      "is_private": false,
      "players_count": 2,
      "created_at": "2026-04-07T15:30:00.000Z"
    }
  ]
}
```

**Erros:** `403` acesso restrito ao administrador

---

### POST `/game/rooms` — Criar sala

🔒 Requer autenticação de administrador.

Somente o usuário com CPF `000.000.000-00` pode criar salas. A criação administrativa não consome fichas.

**Body:**

| Campo            | Tipo    | Padrão | Descrição                   |
|------------------|---------|--------|-----------------------------|
| `name`           | string  | —      | Nome da sala (opcional)     |
| `fichasPerRound` | number  | `5`    | Fichas apostadas por rodada |
| `isPrivate`      | boolean | `false`| Sala privada                |
| `gameType`       | string  | `truco_paulista` | Tipo do jogo: `truco_paulista`, `cacheta` ou `cachetao` |

**Resposta 201:**

```json
{
  "room": {
    "id": "uuid",
    "code": "AB12CD",
    "name": "Sala do João",
    "status": "waiting",
    "fichas_per_round": 5,
    "max_players": 4,
    "is_private": false
  }
}
```

**Erros:** `403` acesso restrito ao administrador

---

### PUT `/game/rooms/:code` — Editar sala

🔒 Requer autenticação de administrador.

Somente o usuário com CPF `000.000.000-00` pode editar salas. A edição só é permitida quando a sala está com status `waiting`.

**Body (todos opcionais):**

| Campo            | Tipo            | Descrição                                         |
|------------------|-----------------|---------------------------------------------------|
| `name`           | string \/ null  | Nome da sala                                      |
| `fichasPerRound` | number          | Fichas apostadas por rodada (inteiro > 0)        |
| `isPrivate`      | boolean         | Sala privada                                      |
| `gameType`       | string          | `truco_paulista`, `cacheta` ou `cachetao`        |

**Resposta 200:**

```json
{
  "room": {
    "id": "uuid",
    "code": "AB12CD",
    "name": "Sala Atualizada",
    "status": "waiting",
    "game_type": "truco_paulista",
    "fichas_per_round": 10,
    "max_players": 4,
    "is_private": false
  }
}
```

**Erros:** `400` payload inválido · `403` acesso restrito ao administrador · `404` sala não encontrada · `409` sala não está em espera

---

### DELETE `/game/rooms/:code` — Remover sala

🔒 Requer autenticação de administrador.

Somente o usuário com CPF `000.000.000-00` pode remover salas. A remoção só é permitida quando a sala está com status `waiting`.

**Resposta 200:**

```json
{ "ok": true }
```

**Erros:** `403` acesso restrito ao administrador · `404` sala não encontrada · `409` sala não está em espera

---

### GET `/game/rooms/:code` — Detalhes de uma sala

🔒 Requer autenticação.

**Resposta 200:**

```json
{
  "room": {
    "id": "uuid",
    "code": "AB12CD",
    "name": "Sala do João",
    "status": "waiting",
    "fichas_per_round": 5,
    "max_players": 4,
    "is_private": false
  },
  "players": [
    { "position": 0, "team": 0, "id": 1, "name": "João", "wins": 5, "losses": 2 },
    { "position": 1, "team": 1, "id": 2, "name": "Maria", "wins": 3, "losses": 4 }
  ]
}
```

**Erros:** `404` sala não encontrada

---

### GET `/game/history` — Histórico de partidas

🔒 Requer autenticação. Retorna as últimas 20 partidas do usuário.

**Resposta 200:**

```json
{
  "history": [
    {
      "id": "uuid",
      "room_code": "AB12CD",
      "final_scores": { "team0": 12, "team1": 8 },
      "rounds_played": 5,
      "duration_secs": 320,
      "won": true,
      "created_at": "2026-04-07T15:30:00.000Z"
    }
  ]
}
```

---

### GET `/health` — Status do servidor

Público. Verifica se o servidor e o banco de dados estão operacionais.

**Resposta 200:** `{ "status": "ok", "db": "connected", "uptime": 3600 }`
**Resposta 503:** `{ "status": "error", "db": "disconnected" }`

---

## WebSocket (Socket.io v4)

Conexão: `ws://localhost:3001` (dev) · `wss://api.playcacheta.online` (produção)

O token JWT deve ser enviado na conexão:

```js
// React Native / JS
io(BASE_URL, { auth: { token } })

// Lua (polling)
GET /socket.io/?EIO=4&transport=polling&token=<jwt>
```

---

### Eventos enviados pelo cliente

#### `room:join`

Entra em uma sala. Se a sala atingir 4 jogadores, o jogo inicia automaticamente.

```json
{ "roomCode": "AB12CD" }
```

**Callback de resposta:**

```json
{ "ok": true, "room": { ... }, "position": 0 }
// ou em reconexão:
{ "ok": true, "reconnected": true }
// ou em erro:
{ "error": "Sala não encontrada." }
```

---

#### `game:play_card`

Joga uma carta. Só funciona na vez do jogador.

```json
{ "cardId": "7_espadas" }
```

Formato do `cardId`: `"<rank>_<naipe>"` com naipe em minúsculo.

| Naipe    | Valor    |
|----------|----------|
| espadas  | Espadas  |
| ouros    | Ouros    |
| copas    | Copas    |
| paus     | Paus     |

Ranks: `4 5 6 7 Q J K A 2 3`

**Callback:** `{ "ok": true }` ou `{ "error": "..." }`

---

#### `game:truco`

Pede/aumenta o truco (Truco → Retruco → Vale Nove → Vale Doze).

Sem payload. **Callback:** `{ "ok": true }` ou `{ "error": "..." }`

---

#### `game:truco_response`

Responde a um pedido de truco.

```json
{ "response": "accept" }
// ou
{ "response": "decline" }
// ou
{ "response": "raise" }
```

**Callback:** `{ "ok": true }` ou `{ "error": "..." }`

---

#### `room:chat`

Envia uma mensagem no chat da sala (máx. 200 caracteres).

```json
{ "message": "Boa sorte!" }
```

---

### Eventos recebidos pelo cliente

#### `room:players`

Disparado sempre que um jogador entra ou sai da sala.

```json
{
  "players": [
    { "position": 0, "team": 0, "id": 1, "name": "João" },
    { "position": 1, "team": 1, "id": 2, "name": "Maria" }
  ]
}
```

---

#### `game:start`

O jogo começou (sala atingiu 4 jogadores).

```json
{ "message": "O jogo começou!" }
```

---

#### `game:state`

Estado do jogo personalizado para o jogador que recebe. Enviado após cada ação.

```json
{
  "status": "playing",
  "round": {
    "number": 1,
    "currentPlayerIdx": 2,
    "tableCards": [
      { "playerIdx": 0, "card": { "rank": "7", "suit": "espadas" } }
    ]
  },
  "myHand": [
    { "id": "3_paus",   "rank": "3", "suit": "paus" },
    { "id": "K_copas",  "rank": "K", "suit": "copas" }
  ],
  "players": [
    { "idx": 0, "name": "João",  "team": 0, "cardCount": 2 },
    { "idx": 1, "name": "Maria", "team": 1, "cardCount": 3 }
  ],
  "teamScores": [6, 4],
  "truco": {
    "pending": false,
    "level": 1,
    "callerTeam": null
  }
}
```

> `myHand` contém apenas as cartas do jogador que recebe o evento.
> Os outros jogadores aparecem só com `cardCount` (sem revelar as cartas).

---

#### `game:round_over`

Uma rodada terminou.

```json
{ "winner": 0, "scores": [6, 4] }
```

`winner` é o índice do time vencedor (`0` ou `1`).

---

#### `game:round_start`

Uma nova rodada começou (disparado após o delay de 3 segundos).

```json
{ "round": 2 }
```

---

#### `game:truco_called`

Alguém pediu truco.

```json
{ "callerName": "João", "nextValue": 3 }
```

`nextValue` é o valor que a mão valerá se aceito.

---

#### `game:over`

Partida encerrada.

```json
{ "winner": 0, "scores": [12, 7] }
```

---

#### `game:player_disconnected`

Um jogador perdeu a conexão (o jogo continua aguardando reconexão).

```json
{ "name": "João" }
```

---

#### `room:chat`

Mensagem de chat recebida.

```json
{
  "from": "João",
  "message": "Boa sorte!",
  "at": "2026-04-07T15:32:00.000Z"
}
```

---

## Integração Lua (cliente do jogo)

O cliente Lua usa os módulos em `network/`:

| Módulo                    | Responsabilidade                                          |
|---------------------------|-----------------------------------------------------------|
| `network/api.lua`         | Wrappers REST: `API.login`, `API.listRooms`, etc.         |
| `network/async.lua`       | Chama `api.lua` em thread separada sem bloquear o render  |
| `network/socketio.lua`    | Conecta e troca eventos WebSocket via polling EIO         |

**Fluxo de login:**

```lua
Async.call('login', { cpf, senha }, function(ok, data)
    if ok then
        Async.setToken(data.token)
        -- data.user contém o perfil do jogador
    end
end)
```

**Fluxo de jogo:**

```lua
-- 1. Conectar ao WebSocket após login
SocketIO.connect(SERVER_URL, token)

-- 2. Entrar na sala
SocketIO.joinRoom(roomCode, function(resp)
    if resp.ok then ... end
end)

-- 3. Ouvir o estado do jogo
SocketIO.on('game:state', function(state) ... end)

-- 4. Jogar carta
SocketIO.playCard('7_espadas')

-- 5. Truco
SocketIO.callTruco()
SocketIO.respondTruco('accept') -- 'accept' | 'decline' | 'raise'
```

**Conversão de carta (servidor → UI Lua):**

O servidor usa `{ rank="7", suit="espadas" }` (minúsculo).
O `ui.lua` espera `{ value="7", suit="Espadas" }` (primeira letra maiúscula).

```lua
local function serverCardToLua(c)
    return {
        value = c.rank,
        suit  = c.suit:sub(1,1):upper() .. c.suit:sub(2),
    }
end
```


---

## Configuração da integração Trio (PIX)

O servidor usa a Trio como gateway de pagamento PIX. As variáveis obrigatórias no `.env` são:

```env
TRIO_ENVIRONMENT=sandbox          # ou production
TRIO_CLIENT_ID=<client_id>
TRIO_CLIENT_SECRET=<client_secret>
TRIO_VIRTUAL_ACCOUNT_ID=<id>
TRIO_BANK_ACCOUNT_ID=<id>
TRIO_WEBHOOK_SECRET=<secret>
TRIO_WEBHOOK_SIGNATURE_KEY=<key>
TRIO_PAYMENT_EXPIRATION_SECONDS=600
```

> As credenciais ficam em `.env` (nunca commitar). Use `TRIO_ENVIRONMENT=sandbox` para testes.

---

### Descobrindo os IDs da conta (cURL)

Substitua `$CLIENT_ID` e `$CLIENT_SECRET` pelos valores do painel Trio.
Para sandbox, o base URL é `https://api.sandbox.trio.com.br`.

**1. Listar entidades** — obtém o `entity_id`:

```bash
curl -s -u "$CLIENT_ID:$CLIENT_SECRET" \
  https://api.sandbox.trio.com.br/banking/entities
```

Resposta relevante:
```json
{
  "data": [{ "id": "<entity_id>", "name": "...", "status": "approved" }]
}
```

---

**2. Listar contas bancárias** — obtém `TRIO_BANK_ACCOUNT_ID` e o `default_virtual_account_id`:

```bash
curl -s -u "$CLIENT_ID:$CLIENT_SECRET" \
  "https://api.sandbox.trio.com.br/banking/bank_accounts?entity_id=<entity_id>"
```

Resposta relevante:
```json
{
  "data": [{
    "id": "<TRIO_BANK_ACCOUNT_ID>",
    "default_virtual_account_id": "<TRIO_VIRTUAL_ACCOUNT_ID>"
  }]
}
```

O campo `default_virtual_account_id` é o valor de `TRIO_VIRTUAL_ACCOUNT_ID`.
O campo `id` é o valor de `TRIO_BANK_ACCOUNT_ID`.

---

**3. Verificar saldo da conta bancária:**

```bash
curl -s -u "$CLIENT_ID:$CLIENT_SECRET" \
  https://api.sandbox.trio.com.br/banking/bank_accounts/<TRIO_BANK_ACCOUNT_ID>/balances
```

---

**4. Listar QR codes gerados (cobranças):**

```bash
curl -s -u "$CLIENT_ID:$CLIENT_SECRET" \
  "https://api.sandbox.trio.com.br/banking/cashin/documents/search?external_id=<transaction_id>"
```

---

### Observações

- A Trio exige que `expiration_datetime` seja **pelo menos 300 segundos no futuro**. O servidor usa 600s por padrão para absorver latência.
- O webhook recebe eventos `collecting_document.settled` e `collecting_document.failed` e deve responder com status `2xx` em até 3 segundos. Tentativas com falha são refeitas com backoff exponencial (até 5 vezes).
- Para registrar o endpoint de webhook no painel: **Developers → Webhooks → Add endpoint** apontando para `https://api.playcacheta.online/payments/webhook`.
