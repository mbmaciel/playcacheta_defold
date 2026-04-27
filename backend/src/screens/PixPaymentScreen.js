import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '../../App';
import { paymentsAPI } from '../services/api';
import { colors, spacing, radius } from '../constants/theme';

function CountdownTimer({ expiresAt }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
  const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');
  const urgent = remaining < 60;

  return (
    <View style={[timerStyles.wrap, urgent && timerStyles.urgent]}>
      <Ionicons name="time-outline" size={16} color={urgent ? colors.error : colors.warning} />
      <Text style={[timerStyles.text, urgent && { color: colors.error }]}>{minutes}:{seconds}</Text>
      <Text style={[timerStyles.label, urgent && { color: colors.error }]}>
        {remaining === 0 ? 'expirado' : urgent ? 'expirando' : 'para pagar'}
      </Text>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warning + '15',
    borderRadius: radius.round,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  urgent: { backgroundColor: colors.error + '15', borderColor: colors.error + '30' },
  text: { fontSize: 18, fontWeight: '800', color: colors.warning, fontVariant: ['tabular-nums'] },
  label: { fontSize: 12, color: colors.warning },
});

export default function PixPaymentScreen({ navigation, route }) {
  const { refreshUser } = useAuth();
  const pkg = route.params?.package;
  const [transaction, setTransaction] = useState(null);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState('pending');
  const alertShownRef = useRef(false);

  const totalFichas = pkg ? (parseInt(pkg.fichas, 10) + parseInt(pkg.bonus || 0, 10)) : 0;
  const pixValue = parseFloat(pkg?.price || 0);
  const expiresAt = transaction?.expires_at;
  const isExpired = useMemo(() => (
    expiresAt
      ? new Date(expiresAt).getTime() <= Date.now() && currentStatus !== 'confirmed'
      : false
  ), [expiresAt, currentStatus]);

  const handleStatusResult = useCallback(async (result, { showAlert = false } = {}) => {
    if (!result?.status) return;

    setCurrentStatus(result.status);

    if (result.status === 'confirmed') {
      await refreshUser();

      if (!alertShownRef.current || showAlert) {
        alertShownRef.current = true;
        Alert.alert('Pagamento confirmado! 🎉', result.message, [
          { text: 'Ver meu saldo', onPress: () => navigation.navigate('Main') },
        ]);
      }
      return;
    }

    if (showAlert && result.status !== 'pending') {
      Alert.alert(
        result.status === 'expired' ? 'Cobrança expirada' : 'Pagamento não concluído',
        result.message
      );
    }
  }, [navigation, refreshUser]);

  useEffect(() => {
    if (!pkg?.id) return;

    (async () => {
      try {
        const res = await paymentsAPI.create(pkg.id);
        setTransaction(res.transaction);
        setCurrentStatus(res.transaction?.status || 'pending');
      } catch (err) {
        Alert.alert('Erro', err.message, [{ text: 'Voltar', onPress: () => navigation.goBack() }]);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation, pkg?.id]);

  useEffect(() => {
    if (!transaction?.id || currentStatus === 'confirmed' || currentStatus === 'cancelled' || currentStatus === 'expired') {
      return undefined;
    }

    const interval = setInterval(async () => {
      try {
        const result = await paymentsAPI.status(transaction.id);
        await handleStatusResult(result);
      } catch (err) {
        console.error('Pix status polling error:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentStatus, handleStatusResult, transaction?.id]);

  const handleCopy = useCallback(async () => {
    const payload = transaction?.pix_payload;
    if (!payload) return;

    try {
      await Clipboard.setStringAsync(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      Alert.alert('Pix Copia e Cola', payload);
    }
  }, [transaction?.pix_payload]);

  const handleConfirm = async () => {
    if (!transaction?.id) return;

    setSyncing(true);
    try {
      const result = await paymentsAPI.confirm(transaction.id);
      await handleStatusResult(result, { showAlert: true });

      if (result.status === 'pending') {
        Alert.alert('Pagamento em processamento', result.message);
      }
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (!pkg) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={{ color: colors.text }}>Pacote não encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.pix} />
          <Text style={styles.loadingText}>Gerando cobrança Pix na Trio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pagamento PIX</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pacote</Text>
            <Text style={styles.summaryValue}>{pkg.label}</Text>
          </View>
          {pkg.bonus > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Bônus</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>+{pkg.bonus} fichas</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total de fichas</Text>
            <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: '800' }]}>
              {totalFichas.toLocaleString('pt-BR')} 🪙
            </Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.summaryLabel}>Valor a pagar</Text>
            <Text style={styles.summaryTotal}>R$ {pixValue.toFixed(2).replace('.', ',')}</Text>
          </View>
        </View>

        {transaction?.expires_at && (
          <View style={styles.timerWrap}>
            <CountdownTimer expiresAt={transaction.expires_at} />
          </View>
        )}

        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>Escaneie o QR Code</Text>
          <Text style={styles.qrSub}>Cobrança gerada pela Trio em tempo real</Text>
          <View style={styles.qrWrap}>
            {transaction?.pix_payload ? (
              <View style={styles.qrCard}>
                <QRCode value={transaction.pix_payload} size={220} />
              </View>
            ) : (
              <Text style={styles.errorText}>Não foi possível carregar o QR Code.</Text>
            )}
          </View>
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>ou copie o BR Code</Text>
            <View style={styles.orLine} />
          </View>
        </View>

        <View style={styles.pixKeySection}>
          <Text style={styles.pixKeyLabel}>Pix Copia e Cola</Text>
          <TouchableOpacity style={styles.pixKeyRow} onPress={handleCopy}>
            <View style={styles.pixKeyIcon}>
              <Ionicons name="copy-outline" size={18} color={colors.pix} />
            </View>
            <Text style={styles.pixKeyText} numberOfLines={2}>{transaction?.pix_payload}</Text>
            <View style={[styles.copyBtn, copied && styles.copyBtnActive]}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? '#fff' : colors.pix} />
              <Text style={[styles.copyText, copied && { color: '#fff' }]}>{copied ? 'Copiado!' : 'Copiar'}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Valor exato:</Text>
            <Text style={styles.valueAmount}>R$ {pixValue.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Status:</Text>
            <Text style={styles.valueAmount}>{currentStatus === 'confirmed' ? 'Confirmado' : currentStatus === 'pending' ? 'Aguardando pagamento' : currentStatus === 'expired' ? 'Expirado' : 'Cancelado'}</Text>
          </View>
        </View>

        <View style={styles.instructionsCard}>
          <Text style={styles.instrTitle}>Como pagar</Text>
          {[
            'Abra o app do seu banco e entre na área Pix.',
            'Escaneie o QR Code acima ou cole o BR Code.',
            `Confirme o valor exato de R$ ${pixValue.toFixed(2).replace('.', ',')}.`,
            'Após o pagamento, a tela consulta a Trio automaticamente.',
            'Se preferir, use o botão abaixo para sincronizar na hora.',
          ].map((step, index) => (
            <View key={step} style={styles.instrRow}>
              <View style={styles.instrNum}>
                <Text style={styles.instrNumText}>{index + 1}</Text>
              </View>
              <Text style={styles.instrText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
          <Text style={styles.warningText}>
            A Trio só envia webhook nas etapas finais da cobrança. Enquanto isso, o app sincroniza o status periodicamente.
          </Text>
        </View>

        <View style={styles.btnSection}>
          <TouchableOpacity
            style={[styles.confirmBtn, (isExpired || syncing || currentStatus === 'confirmed') && { opacity: 0.7 }]}
            onPress={handleConfirm}
            disabled={isExpired || syncing || currentStatus === 'confirmed'}
          >
            <LinearGradient
              colors={syncing ? ['#555', '#444'] : [colors.pix, '#25968A']}
              style={styles.confirmGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name={syncing ? 'hourglass-outline' : 'checkmark-circle-outline'} size={20} color="#fff" />
              <Text style={styles.confirmText}>
                {syncing ? 'Consultando Trio...' : currentStatus === 'confirmed' ? 'Pagamento confirmado' : 'Já paguei — Sincronizar'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancelar pagamento</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  summaryCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  summaryTotal: { fontSize: 20, fontWeight: '900', color: colors.pix },
  timerWrap: { alignItems: 'center', marginBottom: spacing.lg },
  qrSection: { alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  qrTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  qrSub: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md },
  qrWrap: { marginBottom: spacing.lg },
  qrCard: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    shadowColor: colors.pix,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  errorText: { color: colors.error, fontSize: 13 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontSize: 12, color: colors.textDim },
  pixKeySection: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  pixKeyLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  pixKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.pix + '40',
    padding: 12,
    gap: 10,
  },
  pixKeyIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.pix + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pixKeyText: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '600' },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.pix + '18',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.pix + '40',
  },
  copyBtnActive: { backgroundColor: colors.pix, borderColor: colors.pix },
  copyText: { fontSize: 12, color: colors.pix, fontWeight: '700' },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  valueLabel: { fontSize: 13, color: colors.textSecondary },
  valueAmount: { fontSize: 15, fontWeight: '800', color: colors.text },
  instructionsCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  instrTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  instrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  instrNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.pix + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instrNumText: { fontSize: 12, fontWeight: '800', color: colors.pix },
  instrText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.warning + '12',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    padding: 12,
  },
  warningText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  btnSection: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  confirmBtn: { borderRadius: radius.md, overflow: 'hidden' },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: radius.md,
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.md },
  cancelText: { color: colors.error, fontSize: 14, fontWeight: '600' },
});
