import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../App';
import { usersAPI } from '../services/api';
import { colors, spacing, radius } from '../constants/theme';

function formatPhone(text) {
  const digits = text.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const FIELD_CONFIG = {
  profile: {
    title: 'Dados pessoais',
    subtitle: 'Atualize o nome exibido na sua conta.',
    icon: 'person-outline',
    label: 'Nome completo',
    placeholder: 'Seu nome',
    keyboardType: 'default',
    autoCapitalize: 'words',
  },
  phone: {
    title: 'Telefone',
    subtitle: 'Use o número principal para suporte e notificações.',
    icon: 'phone-portrait-outline',
    label: 'WhatsApp',
    placeholder: '(00) 00000-0000',
    keyboardType: 'phone-pad',
    autoCapitalize: 'none',
  },
  email: {
    title: 'E-mail',
    subtitle: 'Esse endereço será usado para comunicação da conta.',
    icon: 'mail-outline',
    label: 'E-mail',
    placeholder: 'voce@email.com',
    keyboardType: 'email-address',
    autoCapitalize: 'none',
  },
};

export default function EditProfileFieldScreen({ navigation, route }) {
  const { user, refreshUser } = useAuth();
  const field = route?.params?.field || 'profile';
  const config = FIELD_CONFIG[field] || FIELD_CONFIG.profile;
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const initialValue = useMemo(() => {
    if (field === 'phone') return user?.phone || '';
    if (field === 'email') return user?.email || '';
    return user?.name || '';
  }, [field, user]);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (text) => {
    if (field === 'phone') {
      setValue(formatPhone(text));
      return;
    }
    if (field === 'email') {
      setValue(text.trim().toLowerCase());
      return;
    }
    setValue(text);
  };

  const handleSave = async () => {
    const trimmed = value.trim();

    if (field === 'profile' && !trimmed) {
      Alert.alert('Nome obrigatório', 'Informe seu nome completo.');
      return;
    }

    if (field === 'phone') {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) {
        Alert.alert('Telefone inválido', 'Informe um telefone com DDD válido.');
        return;
      }
    }

    if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        Alert.alert('E-mail inválido', 'Informe um endereço de e-mail válido.');
        return;
      }
    }

    const payload =
      field === 'profile' ? { name: trimmed } :
      field === 'phone' ? { phone: trimmed } :
      { email: trimmed };

    setLoading(true);
    try {
      await usersAPI.update(payload);
      await refreshUser();
      Alert.alert('Dados atualizados', 'As informações da sua conta foram salvas com sucesso.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Erro ao salvar', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{config.title}</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name={config.icon} size={26} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{config.title}</Text>
            <Text style={styles.cardSub}>{config.subtitle}</Text>

            {field === 'profile' && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>CPF</Text>
                <Text style={styles.infoValue}>{user?.cpf}</Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>{config.label}</Text>
              <View style={styles.inputRow}>
                <Ionicons name={config.icon} size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder={config.placeholder}
                  placeholderTextColor={colors.textDim}
                  value={value}
                  onChangeText={handleChange}
                  keyboardType={config.keyboardType}
                  autoCapitalize={config.autoCapitalize}
                  autoCorrect={false}
                  maxLength={field === 'phone' ? 16 : undefined}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>SALVAR ALTERAÇÕES</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingBottom: spacing.xl },
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary + '16',
    borderWidth: 1,
    borderColor: colors.primary + '35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  cardSub: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: spacing.lg },
  infoBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: spacing.md,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  infoValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  field: { marginBottom: spacing.lg },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  input: { flex: 1, color: colors.text, fontSize: 15 },
  btn: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.2 },
});
