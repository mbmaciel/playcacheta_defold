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

export default function TermsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Termos de Uso</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.banner}>
          <Ionicons name="document-text" size={36} color={colors.info} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Termos e Condições de Uso</Text>
            <Text style={styles.bannerSub}>Última atualização: 01 de março de 2026</Text>
          </View>
        </View>

        <Paragraph>
          Bem-vindo ao Play Cacheta! Ao acessar ou utilizar nosso aplicativo e serviços, você concorda com os presentes Termos de Uso. Leia atentamente antes de criar sua conta.
        </Paragraph>
        <Paragraph>
          Estes Termos constituem um acordo legal entre você ("Usuário") e a Play Cacheta ("Empresa", "nós" ou "nosso"). Se não concordar com alguma cláusula, não utilize o serviço.
        </Paragraph>

        <Section title="1. Definições">
          <BulletItem>
            <Text style={styles.bold}>Play Cacheta:</Text> plataforma digital que comercializa fichas virtuais para uso em jogos de cartas online.
          </BulletItem>
          <BulletItem>
            <Text style={styles.bold}>Fichas:</Text> moeda virtual exclusiva da plataforma, sem valor monetário real, não resgatável em dinheiro.
          </BulletItem>
          <BulletItem>
            <Text style={styles.bold}>Usuário:</Text> pessoa física maior de 18 anos que cria uma conta na plataforma.
          </BulletItem>
          <BulletItem>
            <Text style={styles.bold}>Serviços:</Text> compra de fichas, acesso ao jogo, suporte ao cliente e demais funcionalidades do aplicativo.
          </BulletItem>
        </Section>

        <Section title="2. Elegibilidade e Cadastro">
          <BulletItem>O serviço é restrito a pessoas físicas com 18 anos ou mais</BulletItem>
          <BulletItem>É necessário fornecer informações verdadeiras, completas e atualizadas no cadastro</BulletItem>
          <BulletItem>Cada pessoa pode possuir apenas uma conta ativa</BulletItem>
          <BulletItem>O usuário é responsável pela confidencialidade de sua senha</BulletItem>
          <BulletItem>Contas duplicadas ou com informações falsas serão encerradas</BulletItem>
          <BulletItem>O cadastro de CPF válido é obrigatório para fins de verificação de identidade</BulletItem>
        </Section>

        <Section title="3. Fichas Virtuais">
          <Paragraph>
            As fichas são moedas virtuais utilizadas exclusivamente dentro da plataforma Play Cacheta:
          </Paragraph>
          <BulletItem>Fichas <Text style={styles.bold}>não possuem valor monetário real</Text> e não podem ser convertidas em dinheiro</BulletItem>
          <BulletItem>Fichas não são transferíveis entre contas de usuários</BulletItem>
          <BulletItem>A Empresa se reserva o direito de ajustar os preços dos pacotes a qualquer momento</BulletItem>
          <BulletItem>Fichas de bônus têm validade de 30 dias após o crédito e não são reembolsáveis</BulletItem>
          <BulletItem>Fichas compradas não expiram enquanto a conta estiver ativa</BulletItem>
          <BulletItem>Em caso de encerramento da conta por violação dos Termos, as fichas serão perdidas sem reembolso</BulletItem>
        </Section>

        <Section title="4. Pagamentos via PIX">
          <Paragraph>
            Todos os pagamentos são processados exclusivamente via PIX:
          </Paragraph>
          <BulletItem>O pagamento deve ser realizado em até 5 minutos após a geração do código PIX</BulletItem>
          <BulletItem>As fichas são creditadas automaticamente após a confirmação bancária</BulletItem>
          <BulletItem>O valor exato indicado deve ser pago — pagamentos com valores diferentes podem não ser processados</BulletItem>
          <BulletItem>Estornos e cancelamentos de pagamentos via PIX seguem as regras do Banco Central do Brasil</BulletItem>
          <BulletItem>Em caso de pagamento não creditado em até 24 horas, entre em contato com o suporte</BulletItem>
        </Section>

        <Section title="5. Política de Reembolso">
          <Paragraph>
            Em conformidade com o Código de Defesa do Consumidor (Lei nº 8.078/90):
          </Paragraph>
          <BulletItem>Compras realizadas pelo aplicativo têm direito a reembolso em até 7 dias corridos (arrependimento)</BulletItem>
          <BulletItem>O reembolso só é possível se as fichas compradas não tiverem sido utilizadas</BulletItem>
          <BulletItem>Fichas de bônus não são reembolsáveis</BulletItem>
          <BulletItem>Solicite o reembolso pelo e-mail: reembolso@playcacheta.com.br</BulletItem>
          <BulletItem>O processamento ocorre em até 5 dias úteis após aprovação da solicitação</BulletItem>
        </Section>

        <Section title="6. Regras de Conduta">
          <Paragraph>É estritamente proibido:</Paragraph>
          <BulletItem>Usar o serviço para fins ilegais ou fraudulentos</BulletItem>
          <BulletItem>Criar contas falsas ou usar dados de terceiros sem autorização</BulletItem>
          <BulletItem>Tentar hackear, explorar ou modificar o sistema</BulletItem>
          <BulletItem>Usar bots, scripts ou automações para manipular o jogo</BulletItem>
          <BulletItem>Revender fichas para terceiros</BulletItem>
          <BulletItem>Assediar, ameaçar ou discriminar outros usuários</BulletItem>
          <BulletItem>Utilizar qualquer método para burlar o sistema de pagamentos</BulletItem>
        </Section>

        <Section title="7. Propriedade Intelectual">
          <Paragraph>
            Todo o conteúdo do Play Cacheta — incluindo marca, logotipo, design, código-fonte, textos, imagens e funcionalidades — é de propriedade exclusiva da Empresa e protegido pelas leis de propriedade intelectual.
          </Paragraph>
          <Paragraph>
            É proibida a reprodução, cópia, distribuição ou uso comercial de qualquer elemento sem autorização prévia por escrito.
          </Paragraph>
        </Section>

        <Section title="8. Disponibilidade do Serviço">
          <Paragraph>
            A Empresa envidará esforços razoáveis para manter o serviço disponível 24 horas por dia, 7 dias por semana. Contudo, não garantimos disponibilidade ininterrupta em razão de:
          </Paragraph>
          <BulletItem>Manutenções programadas (com aviso prévio sempre que possível)</BulletItem>
          <BulletItem>Falhas técnicas, de infraestrutura ou de terceiros</BulletItem>
          <BulletItem>Casos de força maior ou eventos imprevisíveis</BulletItem>
          <Paragraph>
            A Empresa não se responsabiliza por perdas decorrentes de indisponibilidade temporária do serviço.
          </Paragraph>
        </Section>

        <Section title="9. Limitação de Responsabilidade">
          <Paragraph>
            A Play Cacheta não será responsável por:
          </Paragraph>
          <BulletItem>Danos decorrentes do uso indevido do serviço pelo usuário</BulletItem>
          <BulletItem>Perda de fichas por compartilhamento de senha ou acesso indevido à conta</BulletItem>
          <BulletItem>Danos indiretos, lucros cessantes ou danos emergentes</BulletItem>
          <BulletItem>Decisões tomadas pelo usuário com base em informações do aplicativo</BulletItem>
        </Section>

        <Section title="10. Suspensão e Encerramento">
          <Paragraph>
            A Empresa pode suspender ou encerrar sua conta, com ou sem aviso prévio, nos seguintes casos:
          </Paragraph>
          <BulletItem>Violação destes Termos de Uso</BulletItem>
          <BulletItem>Uso fraudulento ou suspeito da plataforma</BulletItem>
          <BulletItem>Solicitação do próprio usuário</BulletItem>
          <BulletItem>Exigência de autoridade competente</BulletItem>
          <Paragraph>
            O usuário pode encerrar sua conta a qualquer momento pelo perfil ou entrando em contato com o suporte.
          </Paragraph>
        </Section>

        <Section title="11. Alterações nos Termos">
          <Paragraph>
            Podemos revisar estes Termos periodicamente. As alterações entram em vigor após publicação no aplicativo. O uso continuado após as mudanças implica na aceitação dos novos termos.
          </Paragraph>
          <Paragraph>
            Para alterações significativas, notificaremos os usuários com pelo menos 15 dias de antecedência por e-mail.
          </Paragraph>
        </Section>

        <Section title="12. Lei Aplicável e Foro">
          <Paragraph>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de São Paulo — SP para dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
          </Paragraph>
        </Section>

        <Section title="13. Contato">
          <Paragraph>Para dúvidas sobre estes Termos:</Paragraph>
          <BulletItem>E-mail jurídico: juridico@playcacheta.com.br</BulletItem>
          <BulletItem>Suporte geral: suporte@playcacheta.com.br</BulletItem>
          <BulletItem>WhatsApp: (11) 99999-0000</BulletItem>
          <BulletItem>Horário: Segunda a Sexta, 9h às 18h</BulletItem>
        </Section>

        <View style={styles.footer}>
          <Ionicons name="document-text-outline" size={20} color={colors.info} />
          <Text style={styles.footerText}>
            Play Cacheta — Termos de Uso vigentes desde 01/03/2026
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
    backgroundColor: colors.info + '12',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.info + '30',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  bannerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  policySection: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.info,
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
    backgroundColor: colors.info,
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
