import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, radius } from '../constants/theme';

const QUESTIONS = [
  {
    question: 'Quando as fichas entram na conta?',
    answer: 'Após a confirmação do pagamento, as fichas são creditadas automaticamente na sua conta.',
  },
  {
    question: 'Quais formas de pagamento estão disponíveis?',
    answer: 'No momento, a aplicação trabalha com pagamentos via Pix.',
  },
  {
    question: 'O que fazer se o pagamento não confirmar?',
    answer: 'Aguarde alguns minutos e tente sincronizar novamente. Se o problema continuar, use a área de suporte.',
  },
  {
    question: 'Posso pedir reembolso?',
    answer: 'Casos de reembolso devem ser tratados individualmente pelo suporte da plataforma.',
  },
];

export default function FaqScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perguntas frequentes</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {QUESTIONS.map((item) => (
          <View key={item.question} style={styles.card}>
            <Text style={styles.question}>{item.question}</Text>
            <Text style={styles.answer}>{item.answer}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  question: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  answer: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
