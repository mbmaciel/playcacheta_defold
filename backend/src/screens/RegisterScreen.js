import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../App';
import { authAPI } from '../services/api';
import { colors, spacing, radius } from '../constants/theme';

function formatCPF(text) {
  const d = text.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3);
  if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6);
  return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9);
}

function formatPhone(text) {
  const d = text.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return '(' + d;
  if (d.length <= 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
}

function InputField({ label, icon, value, onChangeText, placeholder, keyboard, secure, showEye, onToggleEye, maxLength }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name={icon} size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboard || 'default'}
          secureTextEntry={secure || false}
          maxLength={maxLength}
          autoCapitalize={keyboard === 'email-address' ? 'none' : 'words'}
        />
        {showEye && (
          <TouchableOpacity onPress={onToggleEye}>
            <Ionicons name={secure ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', cpf: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (field) => (value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleRegister = async () => {
    const { name, cpf, phone, email, password, confirmPassword } = form;
    if (!name || !cpf || !phone || !email || !password || !confirmPassword) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos para continuar.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Senha fraca', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (!acceptTerms) {
      Alert.alert('Termos de Uso', 'Você precisa aceitar os Termos de Uso para criar sua conta.');
      return;
    }

    setLoading(true);
    try {
      const { token, user, message } = await authAPI.register({ name, cpf, phone, email, password });
      Alert.alert('Conta criada! 🎉', message || 'Bem-vindo ao Play Cacheta!', [
        { text: 'Entrar agora', onPress: () => login(token, user) },
      ]);
    } catch (err) {
      Alert.alert('Erro no cadastro', err.message);
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
            <Text style={styles.headerTitle}>Criar Conta</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Text style={styles.iconEmoji}>🃏</Text>
            </View>
            <Text style={styles.cardTitle}>Cadastre-se grátis</Text>
            <Text style={styles.cardSub}>Crie sua conta e ganhe 50 fichas de bônus!</Text>

            <InputField label="Nome completo" icon="person-outline" value={form.name} onChangeText={set('name')} placeholder="Seu nome" />
            <InputField label="CPF" icon="card-outline" value={form.cpf} onChangeText={v => set('cpf')(formatCPF(v))} placeholder="000.000.000-00" keyboard="numeric" maxLength={14} />
            <InputField label="Telefone (WhatsApp)" icon="phone-portrait-outline" value={form.phone} onChangeText={v => set('phone')(formatPhone(v))} placeholder="(00) 00000-0000" keyboard="phone-pad" maxLength={16} />
            <InputField label="E-mail" icon="mail-outline" value={form.email} onChangeText={set('email')} placeholder="seu@email.com" keyboard="email-address" />
            <InputField label="Senha" icon="lock-closed-outline" value={form.password} onChangeText={set('password')} placeholder="Mínimo 6 caracteres" secure={!showPassword} showEye onToggleEye={() => setShowPassword(v => !v)} />
            <InputField label="Confirmar senha" icon="lock-closed-outline" value={form.confirmPassword} onChangeText={set('confirmPassword')} placeholder="Repita a senha" secure={!showPassword} />

            <View style={styles.bonusBox}>
              <Text style={styles.bonusEmoji}>🎁</Text>
              <Text style={styles.bonusText}>
                Você receberá <Text style={{ color: colors.gold, fontWeight: '700' }}>50 fichas de bônus</Text> ao criar sua conta!
              </Text>
            </View>

            <TouchableOpacity style={styles.termsRow} onPress={() => setAcceptTerms(v => !v)}>
              <View style={[styles.checkbox, acceptTerms && styles.checkboxActive]}>
                {acceptTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.termsText}>
                Li e aceito os{' '}
                <Text style={styles.termsLink} onPress={() => navigation.navigate('Terms')}>Termos de Uso</Text>
                {' '}e a{' '}
                <Text style={styles.termsLink} onPress={() => navigation.navigate('PrivacyPolicy')}>Política de Privacidade</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnWrap} onPress={handleRegister} disabled={loading}>
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>CRIAR CONTA</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginText}>Já tem conta? <Text style={styles.loginLink}>Entrar</Text></Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  card: { marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  iconWrap: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.primary + '18', borderWidth: 1, borderColor: colors.primary + '40', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  iconEmoji: { fontSize: 28 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  cardSub: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, fontWeight: '600', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 52, gap: 10 },
  input: { flex: 1, color: colors.text, fontSize: 15 },
  bonusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gold + '12', borderRadius: radius.md, borderWidth: 1, borderColor: colors.gold + '30', padding: 12, gap: 10, marginBottom: spacing.md },
  bonusEmoji: { fontSize: 22 },
  bonusText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: spacing.lg },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  termsText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  termsLink: { color: colors.primary, fontWeight: '600' },
  btnWrap: { borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.lg },
  btn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  loginText: { textAlign: 'center', color: colors.textSecondary, fontSize: 14 },
  loginLink: { color: colors.primary, fontWeight: '700' },
});
