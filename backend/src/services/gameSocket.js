import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiBaseUrl } from '../constants/config';

const BASE_URL = apiBaseUrl;

let socket = null;
const listeners = new Map();

async function connect() {
  if (socket?.connected) return socket;

  const token = await AsyncStorage.getItem('@playcacheta:token');

  socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => console.log('[Socket] Conectado:', socket.id));
  socket.on('disconnect', (reason) => console.log('[Socket] Desconectado:', reason));
  socket.on('connect_error', (err) => console.error('[Socket] Erro:', err.message));

  // Re-registra listeners existentes
  listeners.forEach((handler, event) => socket.on(event, handler));

  return socket;
}

function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

function on(event, handler) {
  listeners.set(event, handler);
  if (socket) socket.on(event, handler);
}

function off(event) {
  listeners.delete(event);
  if (socket) socket.off(event);
}

function emit(event, data) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) return reject(new Error('Socket não conectado.'));
    socket.emit(event, data, (response) => {
      if (response?.error) reject(new Error(response.error));
      else resolve(response);
    });
  });
}

// ============================================================
// API de alto nível para o jogo
// ============================================================
export const gameSocket = {
  connect,
  disconnect,
  on,
  off,

  joinRoom: (roomCode) => emit('room:join', { roomCode }),
  playCard: (cardId) => emit('game:play_card', { cardId }),
  callTruco: () => emit('game:truco', {}),
  respondTruco: (response) => emit('game:truco_response', { response }), // 'accept'|'decline'|'raise'
  sendChat: (message) => socket?.emit('room:chat', { message }),

  isConnected: () => socket?.connected ?? false,
};
