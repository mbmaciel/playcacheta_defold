'use strict';

// ============================================================
// Motor do Truco Paulista (4 jogadores, 2 times)
// ============================================================

const SUITS  = ['paus', 'copas', 'espadas', 'ouros'];
const RANKS  = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
// índice no array = valor base da carta (4=0, 5=1, ..., 3=9)

// Ordem do naipe da manilha: ouros < espadas < copas < paus
const MANILHA_SUIT_VALUE = { ouros: 10, espadas: 11, copas: 12, paus: 13 };

// Valores do truco quando aceito
const TRUCO_SEQUENCE = [1, 3, 6, 9, 12];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function getManilhaRank(vira) {
  const idx = RANKS.indexOf(vira.rank);
  return RANKS[(idx + 1) % RANKS.length];
}

function getCardValue(card, manilhaRank) {
  if (card.rank === manilhaRank) {
    return MANILHA_SUIT_VALUE[card.suit]; // 10–13
  }
  return RANKS.indexOf(card.rank); // 0–9
}

function cardId(card) {
  return `${card.rank}_${card.suit}`;
}

// ============================================================
// Estado inicial de uma partida
// ============================================================
function createGameState(roomId, players) {
  // players: [{ userId, name, socketId }] — 4 jogadores
  return {
    roomId,
    status: 'playing',
    players: players.map((p, i) => ({
      ...p,
      team: i % 2,     // 0,1,0,1
      position: i,
      hand: [],
      score: 0,
    })),
    teamScores: [0, 0],  // pontos acumulados por time
    round: null,
    roundNumber: 0,
  };
}

// ============================================================
// Inicia uma rodada
// ============================================================
function startRound(state, firstPlayerIdx = 0) {
  const deck = shuffle(createDeck());
  const vira = deck.pop();
  const manilhaRank = getManilhaRank(vira);

  // Distribui 3 cartas para cada jogador
  const hands = [[], [], [], []];
  for (let card = 0; card < 3; card++) {
    for (let p = 0; p < 4; p++) {
      hands[p].push(deck.pop());
    }
  }

  state.players.forEach((p, i) => {
    p.hand = hands[i].map(c => ({ ...c, id: cardId(c) }));
  });

  state.roundNumber += 1;
  state.round = {
    number: state.roundNumber,
    vira,
    manilhaRank,
    manilhaSuit: null, // há 4 manilhas, não apenas uma
    tricks: [],        // [{ plays: [{playerIdx, card}], winner: team|'draw' }]
    currentTrick: { plays: [] },
    currentPlayerIdx: firstPlayerIdx,
    trickCount: 0,
    truco: {
      status: null,    // null | 'called' | 'accepted' | 'declined' | 'raised'
      value: 1,        // pontos em disputa: 1, 3, 6, 9, 12
      nextValue: 3,    // próximo valor se aceito
      calledByTeam: null,
      pendingTeam: null, // time que precisa responder
    },
    teamTrickWins: [0, 0],
    winner: null,      // team que ganhou a rodada ou null
  };

  return state;
}

// ============================================================
// Jogar uma carta
// ============================================================
function playCard(state, playerIdx, cardId) {
  const round = state.round;
  const player = state.players[playerIdx];

  if (round.currentPlayerIdx !== playerIdx) {
    return { error: 'Não é sua vez.' };
  }
  if (round.truco.status === 'called') {
    return { error: 'Aguardando resposta ao truco.' };
  }

  const cardIdx = player.hand.findIndex(c => c.id === cardId);
  if (cardIdx === -1) return { error: 'Carta inválida.' };

  const card = player.hand.splice(cardIdx, 1)[0];
  round.currentTrick.plays.push({ playerIdx, card });

  // Completa a vaza (4 jogadores jogaram)
  if (round.currentTrick.plays.length === 4) {
    return _resolveTrick(state);
  }

  // Próximo jogador
  round.currentPlayerIdx = (playerIdx + 1) % 4;
  return { state, event: 'card_played' };
}

function _resolveTrick(state) {
  const round = state.round;
  const { plays } = round.currentTrick;

  // Calcula valores
  let bestValue = -1;
  let bestTeam = null;
  let draw = false;

  plays.forEach(({ playerIdx, card }) => {
    const val = getCardValue(card, round.manilhaRank);
    const team = state.players[playerIdx].team;
    if (val > bestValue) {
      bestValue = val;
      bestTeam = team;
      draw = false;
    } else if (val === bestValue) {
      if (bestTeam !== team) draw = true;
    }
  });

  const trickWinner = draw ? 'draw' : bestTeam;
  round.tricks.push({ plays: [...plays], winner: trickWinner });
  round.currentTrick = { plays: [] };
  round.trickCount += 1;

  if (!draw) {
    round.teamTrickWins[trickWinner] += 1;
  }

  // Verifica se a rodada terminou
  const roundResult = _checkRoundEnd(state);
  if (roundResult) return roundResult;

  // Próxima vaza — quem ganhou a vaza começa
  let nextStarter = round.currentPlayerIdx;
  if (!draw) {
    nextStarter = plays.find(p => state.players[p.playerIdx].team === trickWinner).playerIdx;
  }
  round.currentPlayerIdx = nextStarter;

  return { state, event: 'trick_resolved', trickWinner };
}

function _checkRoundEnd(state) {
  const round = state.round;
  const [t0, t1] = round.teamTrickWins;

  let roundWinner = null;

  // Ganhou 2 vazas → ganhou a rodada
  if (t0 >= 2) roundWinner = 0;
  else if (t1 >= 2) roundWinner = 1;
  // Empate de vazas com 3 jogadas → quem ganhou a 1ª vaza
  else if (round.trickCount === 3) {
    const firstTrick = round.tricks[0].winner;
    if (firstTrick === 'draw') {
      // 1ª e 2ª empatadas → time que ganhou a 2ª, ou empate geral → nenhum ponto
      const secondTrick = round.tricks[1].winner;
      roundWinner = secondTrick === 'draw' ? null : secondTrick;
    } else {
      roundWinner = firstTrick;
    }
  }
  // 1ª vaza empatada + 2ª vaza decidida → quem ganhou a 2ª é o da rodada
  else if (round.trickCount === 2 && round.tricks[0].winner === 'draw' && t0 + t1 === 1) {
    roundWinner = t0 > t1 ? 0 : 1;
  }

  if (roundWinner !== null || round.trickCount === 3) {
    round.winner = roundWinner;
    const points = round.truco.value;
    if (roundWinner !== null) {
      state.teamScores[roundWinner] += points;
    }
    // Verifica fim de jogo
    const gameWinner = state.teamScores[0] >= 12 ? 0 : state.teamScores[1] >= 12 ? 1 : null;
    if (gameWinner !== null) {
      state.status = 'finished';
      state.gameWinner = gameWinner;
      return { state, event: 'game_over', roundWinner, gameWinner };
    }
    return { state, event: 'round_over', roundWinner };
  }
  return null;
}

// ============================================================
// Truco
// ============================================================
function callTruco(state, playerIdx) {
  const round = state.round;
  const callerTeam = state.players[playerIdx].team;

  if (round.truco.status === 'called') return { error: 'Truco já foi pedido.' };
  if (round.truco.value >= 12) return { error: 'Não é possível aumentar mais.' };

  const nextValueIdx = TRUCO_SEQUENCE.indexOf(round.truco.value) + 1;
  const nextValue = TRUCO_SEQUENCE[nextValueIdx] || 12;

  round.truco.status = 'called';
  round.truco.calledByTeam = callerTeam;
  round.truco.pendingTeam = callerTeam === 0 ? 1 : 0;
  round.truco.nextValue = nextValue;

  return { state, event: 'truco_called', callerTeam, nextValue };
}

function respondTruco(state, playerIdx, response) {
  const round = state.round;
  const responderTeam = state.players[playerIdx].team;

  if (round.truco.status !== 'called') return { error: 'Nenhum truco pendente.' };
  if (round.truco.pendingTeam !== responderTeam) return { error: 'Não é sua vez de responder.' };

  if (response === 'accept') {
    round.truco.value = round.truco.nextValue;
    round.truco.status = 'accepted';
    return { state, event: 'truco_accepted', newValue: round.truco.value };
  }

  if (response === 'raise') {
    const currentIdx = TRUCO_SEQUENCE.indexOf(round.truco.nextValue);
    if (currentIdx >= TRUCO_SEQUENCE.length - 1) {
      return { error: 'Não é possível aumentar mais.' };
    }
    const raisedValue = TRUCO_SEQUENCE[currentIdx + 1];
    round.truco.value = round.truco.nextValue;
    round.truco.nextValue = raisedValue;
    round.truco.calledByTeam = responderTeam;
    round.truco.pendingTeam = responderTeam === 0 ? 1 : 0;
    return { state, event: 'truco_raised', newValue: round.truco.nextValue };
  }

  if (response === 'decline') {
    // Time que recusou perde, mas o oponente ganha apenas o valor anterior
    const loserTeam = responderTeam;
    const winnerTeam = loserTeam === 0 ? 1 : 0;
    state.teamScores[winnerTeam] += round.truco.value;
    round.truco.status = 'declined';
    round.winner = winnerTeam;

    const gameWinner = state.teamScores[0] >= 12 ? 0 : state.teamScores[1] >= 12 ? 1 : null;
    if (gameWinner !== null) {
      state.status = 'finished';
      state.gameWinner = gameWinner;
      return { state, event: 'game_over', roundWinner: winnerTeam, gameWinner };
    }
    return { state, event: 'round_over', roundWinner: winnerTeam };
  }

  return { error: 'Resposta inválida. Use: accept, raise ou decline.' };
}

// ============================================================
// Serializa estado para enviar ao cliente (sem cartas dos outros)
// ============================================================
function serializeForPlayer(state, playerIdx) {
  return {
    roomId: state.roomId,
    status: state.status,
    teamScores: state.teamScores,
    gameWinner: state.gameWinner ?? null,
    roundNumber: state.roundNumber,
    players: state.players.map((p, i) => ({
      userId: p.userId,
      name: p.name,
      team: p.team,
      position: p.position,
      cardCount: p.hand.length,
      hand: i === playerIdx ? p.hand : undefined, // só manda suas cartas
    })),
    round: state.round
      ? {
          number: state.round.number,
          vira: state.round.vira,
          manilhaRank: state.round.manilhaRank,
          tricks: state.round.tricks,
          currentTrick: state.round.currentTrick,
          currentPlayerIdx: state.round.currentPlayerIdx,
          teamTrickWins: state.round.teamTrickWins,
          winner: state.round.winner,
          truco: state.round.truco,
          trickCount: state.round.trickCount,
        }
      : null,
  };
}

module.exports = {
  createGameState,
  startRound,
  playCard,
  callTruco,
  respondTruco,
  serializeForPlayer,
};
