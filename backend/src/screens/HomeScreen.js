import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../App';
import { paymentsAPI } from '../services/api';
import { colors, spacing, radius } from '../constants/theme';
import { getAvatarUrl } from '../constants/config';

const statusConfig = {
  confirmed: { label: 'Confirmado', color: colors.success, icon: 'checkmark-circle' },
  pending:   { label: 'Pendente',   color: colors.warning, icon: 'time' },
  cancelled: { label: 'Cancelado',  color: colors.error,   icon: 'close-circle' },
  expired:   { label: 'Expirado',   color: colors.textDim, icon: 'alert-circle' },
};

function TransactionItem({ item }) {
  const cfg = statusConfig[item.status] || statusConfig.cancelled;
  const fichasTotal = (item.fichas_amount || 0) + (item.bonus_amount || 0);
  return (
    <View style={txStyles.row}>
      <View style={[txStyles.iconWrap, { backgroundColor: cfg.color + '18' }]}>
        <Ionicons name="card-outline" size={20} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={txStyles.pkg}>{item.package_label || 'Compra de fichas'}</Text>
        <Text style={txStyles.date}>{new Date(item.created_at).toLocaleDateString('pt-BR')}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={txStyles.value}>R$ {parseFloat(item.value).toFixed(2).replace('.', ',')}</Text>
        <View style={txStyles.statusWrap}>
          <Ionicons name={cfg.icon} size={11} color={cfg.color} />
          <Text style={[txStyles.status, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
    </View>
  );
}

const txStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pkg: { fontSize: 14, fontWeight: '600', color: colors.text },
  date: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  value: { fontSize: 14, fontWeight: '700', color: colors.text },
  statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  status: { fontSize: 11, fontWeight: '600' },
});

export default function HomeScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [txRes] = await Promise.all([
        paymentsAPI.history(),
        refreshUser(),
      ]);
      setTransactions(txRes.transactions || []);
    } catch (err) {
      console.error('HomeScreen load error:', err);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const firstName = user?.name?.split(' ')[0] || 'Jogador';
  const avatarUri = getAvatarUrl(user?.avatar_url);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const recent = transactions.slice(0, 3);

  const QuickAction = ({ icon, label, color, onPress }) => (
    <TouchableOpacity style={[qaStyles.btn, { borderColor: color + '40' }]} onPress={onPress}>
      <View style={[qaStyles.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={qaStyles.label}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{firstName}!</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
            <View style={styles.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Balance card */}
        <View style={styles.cardWrap}>
          <LinearGradient colors={['#1B3A26', '#0D2018', '#061510']} style={styles.balanceCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.decCircle1} />
            <View style={styles.decCircle2} />
            <View style={styles.balanceLabelRow}>
              <Ionicons name="wallet-outline" size={16} color={colors.primary + 'AA'} />
              <Text style={styles.balanceLabel}>Saldo de Fichas</Text>
            </View>
            <Text style={styles.balanceValue}>{(user?.fichas || 0).toLocaleString('pt-BR')}</Text>
            <Text style={styles.balanceSub}>fichas disponíveis</Text>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceFooter}>
              <View>
                <Text style={styles.statLabel}>Total investido</Text>
                <Text style={styles.statValue}>R$ {parseFloat(user?.total_spent || 0).toFixed(2).replace('.', ',')}</Text>
              </View>
              <TouchableOpacity style={styles.buyBadge} onPress={() => navigation.navigate('BuyFichas')}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.buyBadgeText}>Comprar</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações rápidas</Text>
          <View style={qaStyles.grid}>
            <QuickAction icon="card-outline"        label="Comprar fichas" color={colors.primary} onPress={() => navigation.navigate('BuyFichas')} />
            <QuickAction icon="time-outline"         label="Histórico"      color={colors.info}    onPress={() => navigation.navigate('History')} />
            <QuickAction icon="help-circle-outline"  label="Suporte"        color={colors.warning} onPress={() => {}} />
            <QuickAction icon="gift-outline"         label="Indicar amigo"  color={colors.gold}    onPress={() => {}} />
          </View>
        </View>

        {/* Promo banner */}
        <View style={styles.section}>
          <LinearGradient colors={['#1A2A40', '#243350']} style={styles.promoBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.promoLabel}>PROMOÇÃO</Text>
              <Text style={styles.promoTitle}>Bônus de 20% extra</Text>
              <Text style={styles.promoSub}>Em compras acima de R$ 20,00</Text>
            </View>
            <Text style={styles.promoEmoji}>🎉</Text>
          </LinearGradient>
        </View>

        {/* Recent transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transações recentes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAll}>Ver tudo</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.txCard}>
            {recent.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={32} color={colors.textDim} />
                <Text style={styles.emptyText}>Nenhuma transação ainda</Text>
              </View>
            ) : (
              recent.map(tx => <TransactionItem key={tx.id} item={tx} />)
            )}
          </View>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const qaStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  btn: { flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, alignItems: 'center', gap: 8 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', textAlign: 'center' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  greeting: { fontSize: 13, color: colors.textSecondary },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary + '25', borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 21 },
  avatarText: { fontSize: 17, fontWeight: '800', color: colors.primary },
  cardWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  balanceCard: { borderRadius: radius.xl, padding: spacing.lg, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: colors.primary + '30' },
  decCircle1: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: colors.primary + '08', top: -60, right: -40 },
  decCircle2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary + '06', bottom: -30, left: 20 },
  balanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  balanceLabel: { fontSize: 13, color: colors.primary + 'AA', fontWeight: '600' },
  balanceValue: { fontSize: 48, fontWeight: '900', color: colors.primary, lineHeight: 56 },
  balanceSub: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  balanceDivider: { height: 1, backgroundColor: colors.primary + '20', marginBottom: spacing.md },
  balanceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 11, color: colors.textSecondary },
  statValue: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
  buyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.round },
  buyBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  promoBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  promoLabel: { fontSize: 10, color: colors.gold, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  promoTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  promoSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  promoEmoji: { fontSize: 36 },
  txCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: 8 },
  emptyText: { color: colors.textDim, fontSize: 14 },
});
