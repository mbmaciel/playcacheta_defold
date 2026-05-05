import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiBaseUrl } from '../constants/config';

const BASE_URL = apiBaseUrl;

async function getToken() {
  return AsyncStorage.getItem('@playcacheta:token');
}

async function request(method, path, body, requiresAuth = true) {
  const headers = { 'Content-Type': 'application/json' };

  if (requiresAuth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || 'Erro na requisição.');
    err.status = res.status;
    throw err;
  }

  return data;
}

// ============================================================
// Auth
// ============================================================
export const authAPI = {
  login: (cpf, password) =>
    request('POST', '/auth/login', { cpf, password }, false),

  register: (payload) =>
    request('POST', '/auth/register', payload, false),
};

// ============================================================
// Usuário
// ============================================================
export const usersAPI = {
  me: () => request('GET', '/users/me'),
  update: (data) => request('PUT', '/users/me', data),
  changePassword: (currentPassword, newPassword) =>
    request('PUT', '/users/me/password', { currentPassword, newPassword }),
  uploadAvatar: async (asset) => {
    const token = await getToken();
    const uri = asset?.uri;
    if (!uri) {
      const err = new Error('Imagem inválida para upload.');
      err.status = 400;
      throw err;
    }

    const mimeType = asset?.mimeType || asset?.type || 'image/jpeg';
    const ext = mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg';
    const filename = asset?.fileName || ('avatar' + ext);
    const formData = new FormData();

    if (typeof File !== 'undefined' && asset?.file instanceof File) {
      formData.append('avatar', asset.file, asset.file.name || filename);
    } else {
      formData.append('avatar', {
        uri,
        type: mimeType,
        name: filename,
      });
    }

    const res = await fetch(`${BASE_URL}/users/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.error || 'Erro no upload da foto.');
      err.status = res.status;
      err.body = data;
      throw err;
    }

    return data;
  },
};

// ============================================================
// Pacotes
// ============================================================
export const packagesAPI = {
  list: () => request('GET', '/packages', null, false),
};

// ============================================================
// Pagamentos
// ============================================================
export const paymentsAPI = {
  create: (packageId) => request('POST', '/payments', { packageId }),
  confirm: (transactionId) => request('POST', `/payments/${transactionId}/confirm`, {}),
  status: (transactionId) => request('GET', `/payments/${transactionId}/status`),
  history: () => request('GET', '/payments/history'),
};

// ============================================================
// Jogo
// ============================================================
export const gameAPI = {
  listRooms: () => request('GET', '/game/rooms'),
  createRoom: (data) => request('POST', '/game/rooms', data),
  getRoom: (code) => request('GET', `/game/rooms/${code}`),
  history: () => request('GET', '/game/history'),
};

// ============================================================
// Storage helpers
// ============================================================
export const storage = {
  saveToken: (token) => AsyncStorage.setItem('@playcacheta:token', token),
  removeToken: () => AsyncStorage.removeItem('@playcacheta:token'),
  saveUser: (user) => AsyncStorage.setItem('@playcacheta:user', JSON.stringify(user)),
  getUser: async () => {
    const raw = await AsyncStorage.getItem('@playcacheta:user');
    return raw ? JSON.parse(raw) : null;
  },
  removeUser: () => AsyncStorage.removeItem('@playcacheta:user'),
};
