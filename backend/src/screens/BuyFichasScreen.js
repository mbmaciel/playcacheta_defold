import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../App';
import { colors, spacing, radius } from '../constants/theme';

const PACKAGES = [
  {
    id: '1',
    fichas: 50,
    price: 2.00,
    label: '50 Fichas',
    tag: null,
    bonus: 0,
    gradient: ['#1A2535', '#243044'],
  },
  {
    id: '2',
    fichas: 100,
    price: 3.50,
    label: '100 Fichas',
    tag: null,
    bonus: 0,
    gradient: ['#1A2535', '#243044'],
  },
  {
    id: '3',
    fichas: 250,
    price: 7.50,
    label: '250 Fichas',
    tag: null,
    bonus: 0,
    gradient: ['#1A2535', '#243044'],
  },
  {
    id: '4',
    fichas: 500,
    price: 13.00,
    label: '500 Fichas',
    tag: 'POPULAR',
    bonus: 50,
    gradient: ['#1B3030', '#0D2020'],
  },
  {
    id: '5',
    fichas: 1000,
    price: 22.00,
    label: '1.000 Fichas',
    tag: 'MAIS VENDIDO',
    bonus: 150,
    gradient: ['#1B2A20', '#0D1E14'],
  },
  {
    id: '6',
    fichas: 5000,
    price: 90.00,
    label: '5.000 Fichas',
    tag: 'MELHOR VALOR',
    bonus: 1000,
    gradient: ['#2A2010', '#1E1608'],
  },
];

function PackageCard({ pkg, selected, onSelect }) {
  const perFicha = (pkg.price / (pkg.fichas + pkg.bonus)).toFixed(3);
  const isHighlight = !!pkg.tag;
  const tagColor = pkg.tag === 'MAIS VENDIDO' ? colors.primary : pkg.tag === 'MELHOR VALOR' ? colors.gold : colors.info;

  return (
    <TouchableOpacity
      style={[
        styles.pkgCard,
        selected && styles.pkgCardSelected,
        isHighlight && styles.pkgCardHighlight,
      ]}
      onPress={() => onSelect(pkg.id)}
      activeOpacity={0.85}
    >
      {/* Badge */}
      {pkg.tag && (
        <View style={[styles.badge, { backgroundColor: tagColor }]}>
          <Text style={styles.badgeText}>{pkg.tag}</Text>
        </View>
      )}

      <View style={styles.pkgTop}>
        <Text style={styles.pkgEmoji}>🪙</Text>
        <View style={styles.pkgInfo}>
          <Text style={styles.pkgFichas}>{pkg.fichas.toLocaleString('pt-BR')}</Text>
          <Text style={styles.pkgFichasLabel}>fichas</Text>
          {pkg.bonus > 0 && (
            <View style={styles.bonusBadge}>
              <Text style={styles.bonusText}>+{pkg.bonus} bônus</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.pkgBottom}>
        <View>
          <Text style={styles.pkgPrice}>
            R$ {pkg.price.toFixed(2).replace('.', ',')}
          </Text>
          <Text style={styles.perFicha}>
            R$ {perFicha.replace('.', ',')}/ficha
          </Text>
        </View>
        <View style={[styles.selectCircle, selected && styles.selectCircleActive]}>
          {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function BuyFichasScreen({ navigation }) {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState(null);

  const selected = PACKAGES.find(p => p.id === selectedId);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Comprar Fichas</Text>
          <View style={styles.balancePill}>
            <Text style={styles.balanceEmoji}>🪙</Text>
            <Text style={styles.balanceNum}>{user?.fichas?.toLocaleString('pt-BR')}</Text>
          </View>
        </View>

        {/* Subtitle */}
        <View style={styles.subtitleWrap}>
          <Text style={styles.subtitle}>Escolha um pacote e pague via PIX.</Text>
          <Text style={styles.subtitleSub}>As fichas são creditadas automaticamente após a confirmação.</Text>
        </View>

        {/* PIX badge */}
        <View style={styles.pixBadge}>
          <View style={[styles.pixIcon, { backgroundColor: colors.pix + '20' }]}>
            <Ionicons name="flash" size={16} color={colors.pix} />
          </View>
          <View>
            <Text style={styles.pixTitle}>Pagamento via PIX</Text>
            <Text style={styles.pixSub}>Aprovação em até 5 minutos</Text>
          </View>
        </View>

        {/* Packages grid */}
        <View style={styles.grid}>
          {PACKAGES.map(pkg => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              selected={selectedId === pkg.id}
              onSelect={setSelectedId}
            />
          ))}
        </View>

        {/* Guarantee */}
        <View style={styles.guaranteeRow}>
          {[
            { icon: 'shield-checkmark-outline', text: 'Pagamento seguro' },
            { icon: 'flash-outline', text: 'Crédito imediato' },
            { icon: 'headset-outline', text: 'Suporte 24h' },
          ].map(g => (
            <View key={g.text} style={styles.guaranteeItem}>
              <Ionicons name={g.icon} size={16} color={colors.primary} />
              <Text style={styles.guaranteeText}>{g.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom bar */}
      {selected && (
        <View style={styles.bottomBar}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedLabel}>Selecionado</Text>
            <Text style={styles.selectedPkg}>{selected.label}</Text>
          </View>
          <TouchableOpacity
            style={styles.payBtn}
            onPress={() =>
              navigation.navigate('PixPayment', { package: selected })
            }
          >
            <LinearGradient
              colors={[colors.pix, '#25968A']}
              style={styles.payGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="flash" size={18} color="#fff" />
              <Text style={styles.payText}>
                Pagar R$ {selected.price.toFixed(2).replace('.', ',')} via PIX
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: radius.round,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceEmoji: { fontSize: 14 },
  balanceNum: { fontSize: 14, fontWeight: '700', color: colors.text },
  subtitleWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  subtitleSub: { fontSize: 12, color: colors.textDim, marginTop: 3 },
  pixBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.pix + '12',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.pix + '30',
    padding: 12,
  },
  pixIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pixTitle: { fontSize: 14, fontWeight: '700', color: colors.pix },
  pixSub: { fontSize: 12, color: colors.textSecondary },
  grid: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pkgCard: {
    width: '47.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  pkgCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  pkgCardHighlight: {
    borderColor: colors.primary + '50',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  pkgTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12, marginTop: 4 },
  pkgEmoji: { fontSize: 24, marginTop: 2 },
  pkgInfo: { flex: 1 },
  pkgFichas: { fontSize: 22, fontWeight: '900', color: colors.text, lineHeight: 26 },
  pkgFichasLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  bonusBadge: {
    backgroundColor: colors.success + '20',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  bonusText: { fontSize: 10, color: colors.success, fontWeight: '700' },
  pkgBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  pkgPrice: { fontSize: 16, fontWeight: '800', color: colors.text },
  perFicha: { fontSize: 10, color: colors.textDim, marginTop: 2 },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCircleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  guaranteeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  guaranteeItem: { alignItems: 'center', gap: 4 },
  guaranteeText: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedInfo: { flex: 1 },
  selectedLabel: { fontSize: 11, color: colors.textSecondary },
  selectedPkg: { fontSize: 15, fontWeight: '700', color: colors.text },
  payBtn: { flex: 2, borderRadius: radius.md, overflow: 'hidden' },
  payGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 50,
    borderRadius: radius.md,
  },
  payText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
