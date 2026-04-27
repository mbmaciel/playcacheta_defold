import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useToast } from '../../App';
import { authAPI } from '../services/api';
import { colors, spacing, radius } from '../constants/theme';

function formatCPF(text) {
  const d = text.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3);
  if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6);
  return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9);
}

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!cpf || !password) {
      showToast('Preencha o CPF e a senha para continuar.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await authAPI.login(cpf, password);
      await login(token, user);
    } catch (err) {
      showToast(err.message || 'Erro ao entrar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={['#0F1923', '#162030', '#0F1923']} style={styles.hero}>
            <Image
              source={require('../../assets/logo_cacheta.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </LinearGradient>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Entrar na conta</Text>

            <View style={styles.field}>
              <Text style={styles.label}>CPF</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="000.000.000-00"
                  placeholderTextColor={colors.textDim}
                  value={cpf}
                  onChangeText={t => setCpf(formatCPF(t))}
                  keyboardType="numeric"
                  maxLength={14}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textDim}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgot}>
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnWrap} onPress={handleLogin} disabled={loading}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.btn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>ENTRAR</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}>
                Não tem conta? <Text style={styles.registerLink}>Cadastre-se grátis</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
              <Text style={styles.footerLink}>Política de Privacidade</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>•</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
              <Text style={styles.footerLink}>Termos de Uso</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { paddingTop: 36, paddingBottom: 32, alignItems: 'center' },
  logo: { width: 320, height: 160 },
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, fontWeight: '600', letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, height: 52, gap: 10,
  },
  input: { flex: 1, color: colors.text, fontSize: 16 },
  forgot: { alignItems: 'flex-end', marginBottom: spacing.lg },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  btnWrap: { borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.lg },
  btn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  registerText: { textAlign: 'center', color: colors.textSecondary, fontSize: 14 },
  registerLink: { color: colors.primary, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  footerLink: { color: colors.textDim, fontSize: 12 },
  footerDot: { color: colors.textDim, fontSize: 12 },
});
