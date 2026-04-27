import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../App';
import { colors, spacing, radius } from '../constants/theme';

function MenuItem({ icon, iconColor = colors.textSecondary, label, value, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: (iconColor + '18') }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, danger && { color: colors.error }]}>{label}</Text>
        {value && <Text style={styles.menuValue}>{value}</Text>}
      </View>
      {danger && label === 'Saindo...' ? (
        <ActivityIndicator size="small" color={colors.error} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
      )}
    </TouchableOpacity>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Jogador';
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
            <View style={styles.avatarBadge}>
              <Ionicons name="star" size={10} color={colors.gold} />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileCPF}>CPF: {user?.cpf}</Text>
          </View>
        </View>

        {/* Balance summary */}
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceNum}>{user?.fichas?.toLocaleString('pt-BR')}</Text>
            <Text style={styles.balanceLabel}>Fichas atuais</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceNum}>
              R$ {user?.totalComprado?.toFixed(2).replace('.', ',')}
            </Text>
            <Text style={styles.balanceLabel}>Total investido</Text>
          </View>
        </View>

        {/* Account settings */}
        <Section title="Minha conta">
          <MenuItem
            icon="person-outline"
            iconColor={colors.info}
            label="Dados pessoais"
            value={user?.name}
            onPress={() => navigation.navigate('EditProfileField', { field: 'profile' })}
          />
          <View style={styles.itemDivider} />
          <MenuItem
            icon="phone-portrait-outline"
            iconColor={colors.success}
            label="Telefone"
            value={user?.phone}
            onPress={() => navigation.navigate('EditProfileField', { field: 'phone' })}
          />
          <View style={styles.itemDivider} />
          <MenuItem
            icon="mail-outline"
            iconColor={colors.warning}
            label="E-mail"
            value={user?.email}
            onPress={() => navigation.navigate('EditProfileField', { field: 'email' })}
          />
          <View style={styles.itemDivider} />
          <MenuItem
            icon="lock-closed-outline"
            iconColor={colors.error}
            label="Alterar senha"
            onPress={() => navigation.navigate('ChangePassword')}
          />
        </Section>

        {/* Payment */}
        <Section title="Pagamentos">
          <MenuItem
            icon="card-outline"
            iconColor={colors.pix}
            label="Comprar fichas"
            onPress={() => navigation.navigate('BuyFichas')}
          />
          <View style={styles.itemDivider} />
          <MenuItem
            icon="time-outline"
            iconColor={colors.primary}
            label="Histórico de compras"
            onPress={() => navigation.navigate('History')}
          />
        </Section>

        {/* Support */}
        <Section title="Ajuda e suporte">
          <MenuItem
            icon="headset-outline"
            iconColor={colors.warning}
            label="Falar com suporte"
            onPress={() => navigation.navigate('Support')}
          />
          <View style={styles.itemDivider} />
          <MenuItem
            icon="help-circle-outline"
            iconColor={colors.info}
            label="Perguntas frequentes"
            onPress={() => navigation.navigate('Faq')}
          />
          <View style={styles.itemDivider} />
          <MenuItem
            icon="gift-outline"
            iconColor={colors.gold}
            label="Indicar amigos"
            onPress={() => navigation.navigate('ReferFriend')}
          />
        </Section>

        {/* Legal */}
        <Section title="Legal">
          <MenuItem
            icon="shield-checkmark-outline"
            iconColor={colors.primary}
            label="Política de Privacidade"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <View style={styles.itemDivider} />
          <MenuItem
            icon="document-text-outline"
            iconColor={colors.textSecondary}
            label="Termos de Uso"
            onPress={() => navigation.navigate('Terms')}
          />
        </Section>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <MenuItem
              icon="log-out-outline"
              iconColor={colors.error}
              label={loggingOut ? 'Saindo...' : 'Sair da conta'}
              danger
              onPress={loggingOut ? undefined : () => { void handleLogout(); }}
            />
          </View>
        </View>

        {/* Version */}
        <View style={styles.versionWrap}>
          <Text style={styles.versionText}>Play Cacheta v1.0.0</Text>
          <Text style={styles.versionSub}>© 2026 Play Cacheta. Todos os direitos reservados.</Text>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '25',
    borderWidth: 2.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: { fontSize: 24, fontWeight: '900', color: colors.primary },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '800', color: colors.text },
  profileEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  profileCPF: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  balanceRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  balanceDivider: { width: 1, backgroundColor: colors.border },
  balanceNum: { fontSize: 18, fontWeight: '800', color: colors.text },
  balanceLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontSize: 12, color: colors.textSecondary, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  menuValue: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  itemDivider: { height: 1, backgroundColor: colors.border, marginLeft: 58 },
  versionWrap: { alignItems: 'center', paddingVertical: spacing.md },
  versionText: { fontSize: 13, color: colors.textDim },
  versionSub: { fontSize: 11, color: colors.textDim + 'AA', marginTop: 3 },
});
