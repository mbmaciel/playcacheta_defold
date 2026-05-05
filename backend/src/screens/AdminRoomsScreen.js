import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, useToast } from '../../App';
import { gameAPI } from '../services/api';
import { colors, spacing, radius } from '../constants/theme';

function getStatusLabel(status) {
  if (status === 'waiting') return 'Aguardando';
  if (status === 'playing') return 'Em jogo';
  return 'Finalizada';
}

function getStatusColor(status) {
  if (status === 'waiting') return colors.success;
  if (status === 'playing') return colors.warning;
  return colors.textDim;
}

const GAME_TYPES = [
  { value: 'truco_paulista', label: 'Truco' },
  { value: 'cacheta', label: 'Cacheta' },
  { value: 'cachetao', label: 'Cachetao' },
];

export default function AdminRoomsScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [form, setForm] = useState({ name: '', fichasPerRound: '5', isPrivate: false, gameType: 'truco_paulista' });

  const isAdmin = useMemo(() => String(user?.cpf || '').replace(/\D/g, '') === '00000000000', [user?.cpf]);

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await gameAPI.listRoomsForAdmin();
      setRooms(res.rooms || []);
    } catch (err) {
      showToast(err.message || 'Erro ao carregar salas.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  }, [loadRooms]);

  React.useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const resetForm = () => {
    setEditingCode(null);
    setForm({ name: '', fichasPerRound: '5', isPrivate: false, gameType: 'truco_paulista' });
  };

  const startEdit = (room) => {
    setEditingCode(room.code);
    setForm({
      name: room.name || '',
      fichasPerRound: String(room.fichas_per_round || 5),
      isPrivate: !!room.is_private,
      gameType: room.game_type || 'truco_paulista',
    });
  };

  const saveRoom = async () => {
    if (!editingCode) return;
    try {
      const payload = {
        name: form.name.trim() || null,
        fichasPerRound: Number(form.fichasPerRound),
        isPrivate: form.isPrivate,
        gameType: form.gameType,
      };
      await gameAPI.updateRoom(editingCode, payload);
      showToast('Sala atualizada com sucesso.', 'success');
      resetForm();
      await loadRooms();
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar sala.', 'error');
    }
  };

  const confirmAndDeleteRoom = async (code) => {
    try {
      await gameAPI.deleteRoom(code);
      showToast('Sala removida com sucesso.', 'success');
      if (editingCode === code) resetForm();
      await loadRooms();
    } catch (err) {
      showToast(err.message || 'Erro ao remover sala.', 'error');
    }
  };

  const removeRoom = (code) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const accepted = window.confirm('Tem certeza que deseja remover esta sala?');
      if (accepted) {
        confirmAndDeleteRoom(code);
      }
      return;
    }

    Alert.alert('Remover sala', 'Tem certeza que deseja remover esta sala?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          confirmAndDeleteRoom(code);
        },
      },
    ]);
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.blockedWrap}>
          <Ionicons name="lock-closed" size={34} color={colors.warning} />
          <Text style={styles.blockedTitle}>Acesso restrito</Text>
          <Text style={styles.blockedText}>Somente o administrador pode gerenciar salas.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Administração de Salas</Text>
          <TouchableOpacity style={styles.reloadBtn} onPress={loadRooms}>
            <Ionicons name="refresh" size={18} color={colors.text} />
            <Text style={styles.reloadText}>{loading ? 'Atualizando...' : 'Atualizar'}</Text>
          </TouchableOpacity>
        </View>

        {editingCode && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Editando sala {editingCode}</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome da sala"
              placeholderTextColor={colors.textDim}
              value={form.name}
              onChangeText={(name) => setForm(prev => ({ ...prev, name }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Fichas por rodada"
              placeholderTextColor={colors.textDim}
              keyboardType="number-pad"
              value={form.fichasPerRound}
              onChangeText={(fichasPerRound) => setForm(prev => ({ ...prev, fichasPerRound }))}
            />
            <View style={styles.typeRow}>
              {GAME_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.typeBtn, form.gameType === type.value && styles.typeBtnActive]}
                  onPress={() => setForm(prev => ({ ...prev, gameType: type.value }))}
                >
                  <Text style={[styles.typeText, form.gameType === type.value && styles.typeTextActive]}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Sala privada</Text>
              <Switch value={form.isPrivate} onValueChange={(isPrivate) => setForm(prev => ({ ...prev, isPrivate }))} />
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveRoom}>
                <Text style={styles.saveText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {rooms.map(room => {
          const locked = room.status !== 'waiting';
          return (
            <View key={room.id} style={styles.roomCard}>
              <View style={styles.roomTop}>
                <View>
                  <Text style={styles.roomName}>{room.name || `Sala ${room.code}`}</Text>
                  <Text style={styles.roomCode}>Codigo: {room.code}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: getStatusColor(room.status) + '66' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(room.status) }]}>{getStatusLabel(room.status)}</Text>
                </View>
              </View>
              <Text style={styles.roomMeta}>
                {room.game_type} | {room.players_count}/{room.max_players} jogadores | {room.fichas_per_round} fichas | {room.is_private ? 'Privada' : 'Publica'}
              </Text>
              <View style={styles.roomActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn, locked && styles.disabledBtn]}
                  disabled={locked}
                  onPress={() => startEdit(room)}
                >
                  <Text style={styles.actionText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn, locked && styles.disabledBtn]}
                  disabled={locked}
                  onPress={() => removeRoom(room.code)}
                >
                  <Text style={styles.actionText}>Remover</Text>
                </TouchableOpacity>
              </View>
              {locked && <Text style={styles.lockedHint}>Somente salas em espera podem ser alteradas.</Text>}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  reloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md },
  reloadText: { color: colors.text, fontWeight: '600', fontSize: 12 },
  formCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  formTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  input: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.cardAlt },
  typeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  typeText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  typeTextActive: { color: colors.primaryLight },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { color: colors.textSecondary, fontSize: 13 },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  cancelBtn: { flex: 1, backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  saveText: { color: '#05230f', fontWeight: '800' },
  roomCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  roomTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  roomName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  roomCode: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  statusBadge: { borderWidth: 1, borderRadius: radius.round, paddingVertical: 4, paddingHorizontal: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  roomMeta: { color: colors.textSecondary, fontSize: 12 },
  roomActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  editBtn: { backgroundColor: colors.info + '33', borderWidth: 1, borderColor: colors.info + '66' },
  deleteBtn: { backgroundColor: colors.error + '22', borderWidth: 1, borderColor: colors.error + '66' },
  disabledBtn: { opacity: 0.45 },
  actionText: { color: colors.text, fontWeight: '700' },
  lockedHint: { color: colors.warning, fontSize: 11 },
  blockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  blockedTitle: { color: colors.text, fontWeight: '800', fontSize: 18 },
  blockedText: { color: colors.textSecondary, textAlign: 'center' },
});
