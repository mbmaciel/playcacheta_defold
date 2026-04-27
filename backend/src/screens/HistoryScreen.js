import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { paymentsAPI } from '../services/api';
import { colors, spacing, radius } from '../constants/theme';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'confirmed', label: 'Confirmados' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'cancelled', label: 'Cancelados' },
  { key: 'expired', label: 'Expirados' },
];

const statusConfig = {
  confirmed: { label: 'Confirmado', color: colors.success, icon: 'checkmark-circle', bg: colors.success + '18' },
  pending: { label: 'Pendente', color: colors.warning, icon: 'time', bg: colors.warning + '18' },
  cancelled: { label: 'Cancelado', color: colors.error, icon: 'close-circle', bg: colors.error + '18' },
  expired: { label: 'Expirado', color: colors.textDim, icon: 'alert-circle', bg: colors.textDim + '18' },
};

function normalizeTransactions(rows = []) {
  return rows.map((item) => {
    const value = parseFloat(item.value || 0);
    const fichas = (item.fichas_amount || 0) + (item.bonus_amount || 0);

    return {
      id: item.id,
      status: item.status,
      packageLabel: item.package_label || 'Compra de fichas',
      dateLabel: new Date(item.created_at).toLocaleDateString('pt-BR'),
      fichas,
      value,
    };
  });
}

function TransactionCard({ item }) {
  const cfg = statusConfig[item.status] || statusConfig.cancelled;

  return (
    <View style={styles.card}>
      <View style={[styles.cardIcon, { backgroundColor: cfg.bg }]}>
        <Ionicons name="card-outline" size={22} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardPkg}>{item.packageLabel}</Text>
        <Text style={styles.cardDate}>{item.dateLabel}</Text>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={11} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.cardFichas}>+{item.fichas.toLocaleString('pt-BR')} 🪙</Text>
        <Text style={styles.cardValue}>R$ {item.value.toFixed(2).replace('.', ',')}</Text>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const res = await paymentsAPI.history();
      setTransactions(normalizeTransactions(res.transactions));
    } catch (err) {
      console.error('HistoryScreen load error:', err);
      setTransactions([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const filtered = useMemo(() => (
    filter === 'all'
      ? transactions
      : transactions.filter((transaction) => transaction.status === filter)
  ), [filter, transactions]);

  const totalConfirmed = useMemo(
    () => transactions
      .filter((transaction) => transaction.status === 'confirmed')
      .reduce((accumulator, transaction) => accumulator + transaction.value, 0),
    [transactions]
  );

  const totalFichas = useMemo(
    () => transactions
      .filter((transaction) => transaction.status === 'confirmed')
      .reduce((accumulator, transaction) => accumulator + transaction.fichas, 0),
    [transactions]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>R$ {totalConfirmed.toFixed(2).replace('.', ',')}</Text>
          <Text style={styles.statLabel}>Total investido</Text>
        </View>
        <View style={[styles.statCard, styles.statCardCenter]}>
          <Text style={styles.statValue}>{transactions.length}</Text>
          <Text style={styles.statLabel}>Transações</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {totalFichas.toLocaleString('pt-BR')}
          </Text>
          <Text style={styles.statLabel}>Fichas compradas</Text>
        </View>
      </View>

      <View style={styles.filtersWrap}>
        <View style={styles.filters}>
          {FILTERS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterTab, filter === item.key && styles.filterTabActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionCard item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.textDim} />
            <Text style={styles.emptyTitle}>Nenhuma transação</Text>
            <Text style={styles.emptySub}>
              {filter === 'all'
                ? 'Você ainda não realizou nenhuma compra.'
                : `Nenhuma transação com status "${FILTERS.find((item) => item.key === filter)?.label}".`}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statCardCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  filtersWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surface,
    borderRadius: radius.round,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.round,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 12,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPkg: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  cardDate: { fontSize: 12, color: colors.textSecondary, marginBottom: 5 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardFichas: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  cardValue: { fontSize: 13, color: colors.textSecondary },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', maxWidth: 260 },
});
