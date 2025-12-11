import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { Rex, Sdis, Profile } from '@/types';

// Register font (optional - uses default if not available)
Font.register({
  family: 'JetBrains Mono',
  src: 'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.woff2',
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#b91c1c',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 40,
    height: 40,
    backgroundColor: '#b91c1c',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  brandName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  brandSubtitle: {
    fontSize: 8,
    color: '#666666',
    letterSpacing: 2,
  },
  headerRight: {
    textAlign: 'right',
  },
  date: {
    fontSize: 9,
    color: '#666666',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    lineHeight: 1.4,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 25,
    gap: 10,
  },
  metaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginRight: 10,
    marginBottom: 5,
  },
  metaBadgeCritique: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  metaBadgeMajeur: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  metaBadgeSignificatif: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  metaBadgeDefault: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  metaText: {
    fontSize: 9,
  },
  metaTextCritique: {
    color: '#dc2626',
  },
  metaTextMajeur: {
    color: '#ea580c',
  },
  metaTextSignificatif: {
    color: '#ca8a04',
  },
  metaTextDefault: {
    color: '#4b5563',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#b91c1c',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionContent: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 8,
    color: '#6b7280',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  pageNumber: {
    fontSize: 8,
    color: '#9ca3af',
  },
});

interface RexPdfTemplateProps {
  rex: Rex & {
    author?: Profile;
    sdis?: Sdis;
  };
}

// Helper to strip HTML tags
function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export function RexPdfTemplate({ rex }: RexPdfTemplateProps) {
  const severityLabel = {
    critique: 'CRITIQUE',
    majeur: 'MAJEUR',
    significatif: 'SIGNIFICATIF',
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critique':
        return { badge: styles.metaBadgeCritique, text: styles.metaTextCritique };
      case 'majeur':
        return { badge: styles.metaBadgeMajeur, text: styles.metaTextMajeur };
      case 'significatif':
        return { badge: styles.metaBadgeSignificatif, text: styles.metaTextSignificatif };
      default:
        return { badge: styles.metaBadgeDefault, text: styles.metaTextDefault };
    }
  };

  const severityStyles = getSeverityStyles(rex.severity);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>M</Text>
            </View>
            <View>
              <Text style={styles.brandName}>MEMO-OPS</Text>
              <Text style={styles.brandSubtitle}>RETOUR D&apos;EXPÉRIENCE</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.date}>
              Généré le {new Date().toLocaleDateString('fr-FR')}
            </Text>
            <Text style={styles.date}>
              {rex.sdis ? `SDIS ${rex.sdis.code}` : ''}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{rex.title}</Text>

        {/* Meta */}
        <View style={styles.metaContainer}>
          <View style={[styles.metaBadge, severityStyles.badge]}>
            <Text style={[styles.metaText, severityStyles.text]}>
              {severityLabel[rex.severity as keyof typeof severityLabel]}
            </Text>
          </View>
          <View style={[styles.metaBadge, styles.metaBadgeDefault]}>
            <Text style={[styles.metaText, styles.metaTextDefault]}>
              {rex.type}
            </Text>
          </View>
          <View style={[styles.metaBadge, styles.metaBadgeDefault]}>
            <Text style={[styles.metaText, styles.metaTextDefault]}>
              {new Date(rex.intervention_date).toLocaleDateString('fr-FR')}
            </Text>
          </View>
          {rex.author && (
            <View style={[styles.metaBadge, styles.metaBadgeDefault]}>
              <Text style={[styles.metaText, styles.metaTextDefault]}>
                {rex.author.full_name}
              </Text>
            </View>
          )}
        </View>

        {/* Sections */}
        {rex.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Synthèse</Text>
            <Text style={styles.sectionContent}>{stripHtml(rex.description)}</Text>
          </View>
        )}

        {rex.context && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contexte opérationnel</Text>
            <Text style={styles.sectionContent}>{stripHtml(rex.context)}</Text>
          </View>
        )}

        {rex.means_deployed && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Moyens engagés</Text>
            <Text style={styles.sectionContent}>{stripHtml(rex.means_deployed)}</Text>
          </View>
        )}

        {rex.difficulties && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Difficultés rencontrées</Text>
            <Text style={styles.sectionContent}>{stripHtml(rex.difficulties)}</Text>
          </View>
        )}

        {rex.lessons_learned && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enseignements</Text>
            <Text style={styles.sectionContent}>{stripHtml(rex.lessons_learned)}</Text>
          </View>
        )}

        {/* Tags */}
        {rex.tags && rex.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {rex.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            RETEX360 - Plateforme RETEX Collaborative
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
