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

function Section({ title, children }) {
  return (
    <View style={styles.policySection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function BulletItem({ children }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bullet} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Política de Privacidade</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.banner}>
          <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Sua privacidade importa</Text>
            <Text style={styles.bannerSub}>Última atualização: 01 de março de 2026</Text>
          </View>
        </View>

        <Paragraph>
          A Play Cacheta ("nós", "nosso" ou "Empresa") está comprometida com a proteção da sua privacidade. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais quando você utiliza nossos serviços.
        </Paragraph>

        <Paragraph>
          Ao criar uma conta ou usar o Play Cacheta, você concorda com as práticas descritas nesta política. Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </Paragraph>

        <Section title="1. Dados que Coletamos">
          <Paragraph>Coletamos os seguintes tipos de informações:</Paragraph>
          <BulletItem>
            <Text style={styles.bold}>Dados de cadastro:</Text> nome completo, CPF, e-mail, número de telefone e senha criptografada.
          </BulletItem>
          <BulletItem>
            <Text style={styles.bold}>Dados de pagamento:</Text> histórico de transações, valores pagos e status dos pagamentos via PIX. Não armazenamos dados bancários ou chaves PIX pessoais.
          </BulletItem>
          <BulletItem>
            <Text style={styles.bold}>Dados de uso:</Text> data e hora de acesso, endereço IP, tipo de dispositivo, sistema operacional e atividades dentro do aplicativo.
          </BulletItem>
          <BulletItem>
            <Text style={styles.bold}>Dados de localização:</Text> apenas dados de localização aproximada para fins de segurança e prevenção a fraudes.
          </BulletItem>
        </Section>

        <Section title="2. Como Usamos seus Dados">
          <Paragraph>Utilizamos suas informações para:</Paragraph>
          <BulletItem>Criar e gerenciar sua conta no Play Cacheta</BulletItem>
          <BulletItem>Processar pagamentos e creditnar fichas em sua conta</BulletItem>
          <BulletItem>Verificar sua identidade e prevenir fraudes</BulletItem>
          <BulletItem>Enviar notificações sobre transações e atualizações do serviço</BulletItem>
          <BulletItem>Prestar suporte ao cliente</BulletItem>
          <BulletItem>Cumprir obrigações legais e regulatórias</BulletItem>
          <BulletItem>Melhorar nossos serviços com base em dados agregados e anonimizados</BulletItem>
        </Section>

        <Section title="3. Base Legal para Tratamento">
          <Paragraph>
            O tratamento dos seus dados pessoais é realizado com base nas seguintes hipóteses previstas na LGPD:
          </Paragraph>
          <BulletItem>Execução de contrato: para prestar os serviços que você contratou</BulletItem>
          <BulletItem>Consentimento: para envio de comunicações de marketing (você pode revogar a qualquer momento)</BulletItem>
          <BulletItem>Obrigação legal: para cumprir requisitos legais e regulatórios</BulletItem>
          <BulletItem>Interesse legítimo: para prevenção a fraudes e segurança do serviço</BulletItem>
        </Section>

        <Section title="4. Compartilhamento de Dados">
          <Paragraph>
            Não vendemos seus dados pessoais. Podemos compartilhá-los apenas com:
          </Paragraph>
          <BulletItem>
            <Text style={styles.bold}>Processadores de pagamento:</Text> para viabilizar transações PIX em conformidade com as normas do Banco Central do Brasil.
          </BulletItem>
          <BulletItem>
            <Text style={styles.bold}>Prestadores de serviço:</Text> empresas que nos auxiliam na operação do serviço (hospedagem, suporte técnico), sempre sob obrigações de confidencialidade.
          </BulletItem>
          <BulletItem>
            <Text style={styles.bold}>Autoridades competentes:</Text> quando exigido por lei, ordem judicial ou para proteger direitos e segurança.
          </BulletItem>
        </Section>

        <Section title="5. Segurança dos Dados">
          <Paragraph>
            Adotamos medidas técnicas e organizacionais para proteger seus dados:
          </Paragraph>
          <BulletItem>Criptografia SSL/TLS em todas as comunicações</BulletItem>
          <BulletItem>Senhas armazenadas com hash seguro (bcrypt)</BulletItem>
          <BulletItem>Autenticação em dois fatores disponível</BulletItem>
          <BulletItem>Monitoramento contínuo contra acessos não autorizados</BulletItem>
          <BulletItem>Servidores localizados no Brasil, em datacenters certificados</BulletItem>
        </Section>

        <Section title="6. Seus Direitos (LGPD)">
          <Paragraph>Você tem os seguintes direitos em relação aos seus dados:</Paragraph>
          <BulletItem>
            <Text style={styles.bold}>Acesso:</Text> solicitar confirmação e cópia dos dados que temos sobre você
          </BulletItem>
          <BulletItem>
            <Text style={styles.bold}>Correção:</Text> corrigir dados incompletos, inexatos ou desatualizados
          </BulletItem>
          <BulletItem>
            <Text style={styles.bold}>Anonimização ou exclusão:</Text> solicitar a anonimização ou exclusão de dados desnecessários
          </BulletItem>
          <BulletItem>
            <Text style={styles.bold}>Portabilidade:</Text> receber seus dados em formato estruturado
          </BulletItem>
          <BulletItem>
            <Text style={styles.bold}>Revogação do consentimento:</Text> cancelar autorizações que você tenha dado
          </BulletItem>
          <BulletItem>
            <Text style={styles.bold}>Oposição:</Text> opor-se ao tratamento realizado com fundamento em interesse legítimo
          </BulletItem>
          <Paragraph>
            Para exercer seus direitos, entre em contato: privacidade@playcacheta.com.br
          </Paragraph>
        </Section>

        <Section title="7. Retenção de Dados">
          <Paragraph>
            Mantemos seus dados pelo tempo necessário para a prestação dos serviços e cumprimento de obrigações legais. Após o encerramento da conta:
          </Paragraph>
          <BulletItem>Dados de pagamento: mantidos por 5 anos (obrigação fiscal)</BulletItem>
          <BulletItem>Dados de cadastro: excluídos em até 30 dias</BulletItem>
          <BulletItem>Logs de acesso: mantidos por 6 meses (Marco Civil da Internet)</BulletItem>
        </Section>

        <Section title="8. Cookies e Tecnologias Similares">
          <Paragraph>
            Utilizamos cookies e tecnologias similares para manter sua sessão ativa, lembrar preferências e analisar o uso do aplicativo. Você pode desativar cookies nas configurações do seu navegador, mas isso pode afetar a funcionalidade do serviço.
          </Paragraph>
        </Section>

        <Section title="9. Menores de Idade">
          <Paragraph>
            O Play Cacheta é destinado exclusivamente a maiores de 18 anos. Não coletamos intencionalmente dados de menores de idade. Se identificarmos que um menor cadastrou uma conta, a excluiremos imediatamente.
          </Paragraph>
        </Section>

        <Section title="10. Alterações nesta Política">
          <Paragraph>
            Podemos atualizar esta política periodicamente. Notificaremos você sobre mudanças significativas por e-mail ou notificação no aplicativo. O uso continuado do serviço após as alterações constitui aceite da nova política.
          </Paragraph>
        </Section>

        <Section title="11. Contato — DPO">
          <Paragraph>
            Para dúvidas, solicitações ou reclamações relacionadas à privacidade:
          </Paragraph>
          <BulletItem>E-mail: privacidade@playcacheta.com.br</BulletItem>
          <BulletItem>Suporte: suporte@playcacheta.com.br</BulletItem>
          <BulletItem>Horário de atendimento: Segunda a Sexta, 9h às 18h</BulletItem>
          <Paragraph>
            Você também pode registrar reclamações junto à Autoridade Nacional de Proteção de Dados (ANPD): www.gov.br/anpd
          </Paragraph>
        </Section>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <Text style={styles.footerText}>
            Play Cacheta — Em conformidade com a LGPD (Lei nº 13.709/2018)
          </Text>
        </View>

        <View style={{ height: spacing.xl }} />
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  content: { padding: spacing.lg },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.primary + '12',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  bannerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  policySection: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.sm,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paragraph: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
    paddingLeft: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bold: { fontWeight: '700', color: colors.text },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: { flex: 1, fontSize: 12, color: colors.textDim, lineHeight: 18 },
});
