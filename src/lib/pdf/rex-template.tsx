import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { Rex, Sdis, Profile, FocusThematique, ProductionType, KeyFigures, BilanHumain, TimelineEvent, Prescription } from '@/types';
import { TIMELINE_EVENT_CONFIG, PRESCRIPTION_CATEGORY_CONFIG } from '@/types';

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
  productionTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 15,
  },
  productionTypeSignalement: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  productionTypePex: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  productionTypeRetex: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  productionTypeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  focusSection: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  focusTheme: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#b91c1c',
    marginBottom: 6,
  },
  focusContent: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
  },
  twoColumnContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  column: {
    flex: 1,
  },
  elementFavorable: {
    backgroundColor: '#ecfdf5',
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
    padding: 10,
    marginBottom: 10,
  },
  elementDefavorable: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    padding: 10,
    marginBottom: 10,
  },
  elementTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  elementContent: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
  },
  annexeHeader: {
    backgroundColor: '#b91c1c',
    padding: 10,
    marginBottom: 20,
  },
  annexeTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  annexeSubtitle: {
    color: '#ffffff',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  keyFiguresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 8,
  },
  keyFigureCard: {
    width: '18%',
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  keyFigureValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  keyFigureLabel: {
    fontSize: 7,
    color: '#6b7280',
    textAlign: 'center',
  },
  keyFigureSubValue: {
    fontSize: 6,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 2,
  },
  timelineContainer: {
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
    marginTop: 3,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeure: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 2,
  },
  timelineTitre: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  timelineDescription: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  prescriptionContainer: {
    marginBottom: 20,
  },
  prescriptionCategory: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  prescriptionItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 10,
  },
  prescriptionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
    marginTop: 4,
  },
  prescriptionText: {
    flex: 1,
    fontSize: 9,
    color: '#374151',
  },
  prescriptionMeta: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 2,
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
  anonymize?: boolean;
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

export function RexPdfTemplate({ rex, anonymize = false }: RexPdfTemplateProps) {
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

  const getProductionTypeStyles = (type: ProductionType) => {
    switch (type) {
      case 'signalement':
        return { badge: styles.productionTypeSignalement, label: 'SIGNALEMENT' };
      case 'pex':
        return { badge: styles.productionTypePex, label: 'PEX - Point d\'Étape eXpérience' };
      case 'retex':
      default:
        return { badge: styles.productionTypeRetex, label: 'RETEX - Retour d\'Expérience' };
    }
  };

  const productionTypeStyles = getProductionTypeStyles(rex.type_production || 'retex');

  const focusThematiques = (rex.focus_thematiques as unknown as FocusThematique[]) || [];
  const keyFigures = (rex.key_figures as unknown as KeyFigures) || {};
  const chronologie = (rex.chronologie as unknown as TimelineEvent[]) || [];
  const prescriptions = (rex.prescriptions as unknown as Prescription[]) || [];

  const getTimelineColor = (type: string): string => {
    const colors: Record<string, string> = {
      alerte: '#ef4444',
      arrivee: '#3b82f6',
      action: '#f59e0b',
      message_radio: '#8b5cf6',
      fin: '#22c55e',
      autre: '#6b7280',
    };
    return colors[type] || '#6b7280';
  };

  const groupPrescriptionsByCategory = () => {
    const grouped: Record<string, Prescription[]> = {};
    prescriptions.forEach((p) => {
      if (!grouped[p.categorie]) {
        grouped[p.categorie] = [];
      }
      grouped[p.categorie].push(p);
    });
    return grouped;
  };

  const getPrescriptionStatusColor = (status?: string): string => {
    switch (status) {
      case 'fait': return '#22c55e';
      case 'en_cours': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  const formatBilanHumain = (bilan: BilanHumain | undefined): string => {
    if (!bilan) return '';
    const parts: string[] = [];
    if (bilan.victimes_decedees) parts.push(`${bilan.victimes_decedees} DCD`);
    if (bilan.victimes_urgence_absolue) parts.push(`${bilan.victimes_urgence_absolue} UA`);
    if (bilan.victimes_urgence_relative) parts.push(`${bilan.victimes_urgence_relative} UR`);
    if (bilan.impliques) parts.push(`${bilan.impliques} impl.`);
    return parts.join(' / ');
  };

  const getBilanTotal = (bilan: BilanHumain | undefined): number => {
    if (!bilan) return 0;
    return (bilan.victimes_decedees || 0) + 
           (bilan.victimes_urgence_absolue || 0) + 
           (bilan.victimes_urgence_relative || 0) + 
           (bilan.impliques || 0);
  };

  const hasKeyFigures = keyFigures && (
    keyFigures.nb_sp_engages ||
    keyFigures.duree_intervention ||
    keyFigures.nb_vehicules ||
    keyFigures.bilan_humain ||
    keyFigures.sdis_impliques?.length
  );

  const getAuthorDisplay = () => {
    if (!rex.author) return '';
    if (anonymize) {
      return rex.author.grade || 'Agent';
    }
    return rex.author.full_name || '';
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>{rex.sdis?.code || 'M'}</Text>
            </View>
            <View>
              <Text style={styles.brandName}>
                {rex.sdis ? `SDIS ${rex.sdis.code}` : 'MEMO-OPS'}
              </Text>
              <Text style={styles.brandSubtitle}>
                {rex.sdis?.name || 'RETOUR D\'EXPÉRIENCE'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.date}>
              Document généré le {new Date().toLocaleDateString('fr-FR')}
            </Text>
            <Text style={[styles.date, { fontWeight: 'bold', marginTop: 4 }]}>
              {productionTypeStyles.label}
            </Text>
          </View>
        </View>

        {/* Production Type Badge */}
        <View style={[styles.productionTypeBadge, productionTypeStyles.badge]}>
          <Text style={styles.productionTypeText}>{productionTypeStyles.label}</Text>
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
                {getAuthorDisplay()}
              </Text>
            </View>
          )}
        </View>

        {/* Key Figures */}
        {hasKeyFigures && (
          <View style={styles.keyFiguresContainer}>
            {keyFigures.nb_sp_engages && (
              <View style={styles.keyFigureCard}>
                <Text style={styles.keyFigureValue}>{keyFigures.nb_sp_engages}</Text>
                <Text style={styles.keyFigureLabel}>SP engagés</Text>
              </View>
            )}
            {keyFigures.duree_intervention && (
              <View style={styles.keyFigureCard}>
                <Text style={styles.keyFigureValue}>{keyFigures.duree_intervention}</Text>
                <Text style={styles.keyFigureLabel}>Durée</Text>
              </View>
            )}
            {getBilanTotal(keyFigures.bilan_humain) > 0 && (
              <View style={styles.keyFigureCard}>
                <Text style={styles.keyFigureValue}>{getBilanTotal(keyFigures.bilan_humain)}</Text>
                <Text style={styles.keyFigureLabel}>Bilan humain</Text>
                <Text style={styles.keyFigureSubValue}>{formatBilanHumain(keyFigures.bilan_humain)}</Text>
              </View>
            )}
            {keyFigures.nb_vehicules && (
              <View style={styles.keyFigureCard}>
                <Text style={styles.keyFigureValue}>{keyFigures.nb_vehicules}</Text>
                <Text style={styles.keyFigureLabel}>Véhicules</Text>
              </View>
            )}
            {keyFigures.sdis_impliques && keyFigures.sdis_impliques.length > 0 && (
              <View style={styles.keyFigureCard}>
                <Text style={styles.keyFigureValue}>{keyFigures.sdis_impliques.length}</Text>
                <Text style={styles.keyFigureLabel}>SDIS impliqués</Text>
                <Text style={styles.keyFigureSubValue}>{keyFigures.sdis_impliques.join(', ')}</Text>
              </View>
            )}
          </View>
        )}

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

        {/* Timeline chronologique */}
        {chronologie.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chronologie de l&apos;intervention</Text>
            <View style={styles.timelineContainer}>
              {chronologie.map((event, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: getTimelineColor(event.type) }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineHeure}>{event.heure} - {TIMELINE_EVENT_CONFIG[event.type]?.label || event.type}</Text>
                    <Text style={styles.timelineTitre}>{event.titre}</Text>
                    {event.description && (
                      <Text style={styles.timelineDescription}>{event.description}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
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

        {/* Prescriptions */}
        {prescriptions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prescriptions</Text>
            <View style={styles.prescriptionContainer}>
              {Object.entries(groupPrescriptionsByCategory()).map(([category, items]) => (
                <View key={category} style={{ marginBottom: 10 }}>
                  <Text style={styles.prescriptionCategory}>
                    {PRESCRIPTION_CATEGORY_CONFIG[category as keyof typeof PRESCRIPTION_CATEGORY_CONFIG]?.label || category}
                  </Text>
                  {items.map((prescription, index) => (
                    <View key={index} style={styles.prescriptionItem}>
                      <View style={[styles.prescriptionBullet, { backgroundColor: getPrescriptionStatusColor(prescription.statut) }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.prescriptionText}>{prescription.description}</Text>
                        {(prescription.responsable || prescription.echeance) && (
                          <Text style={styles.prescriptionMeta}>
                            {prescription.responsable && `Responsable: ${prescription.responsable}`}
                            {prescription.responsable && prescription.echeance && ' • '}
                            {prescription.echeance && `Échéance: ${new Date(prescription.echeance).toLocaleDateString('fr-FR')}`}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* DGSCGC Fields - Message d'ambiance */}
        {rex.message_ambiance && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message d&apos;ambiance</Text>
            <Text style={styles.sectionContent}>{stripHtml(rex.message_ambiance)}</Text>
          </View>
        )}

        {/* SITAC */}
        {rex.sitac && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SITAC - Situation Tactique</Text>
            <Text style={styles.sectionContent}>{stripHtml(rex.sitac)}</Text>
          </View>
        )}

        {/* Éléments favorables/défavorables */}
        {(rex.elements_favorables || rex.elements_defavorables) && (
          <View style={styles.twoColumnContainer}>
            {rex.elements_favorables && (
              <View style={[styles.column, styles.elementFavorable]}>
                <Text style={[styles.elementTitle, { color: '#059669' }]}>✓ Éléments favorables</Text>
                <Text style={styles.elementContent}>{stripHtml(rex.elements_favorables)}</Text>
              </View>
            )}
            {rex.elements_defavorables && (
              <View style={[styles.column, styles.elementDefavorable]}>
                <Text style={[styles.elementTitle, { color: '#dc2626' }]}>✗ Éléments défavorables</Text>
                <Text style={styles.elementContent}>{stripHtml(rex.elements_defavorables)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Focus Thématiques */}
        {focusThematiques.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Focus Thématiques (Annexe F - DGSCGC)</Text>
            {focusThematiques.map((focus, index) => (
              <View key={index} style={styles.focusSection}>
                <Text style={styles.focusTheme}>{focus.theme}</Text>
                {focus.constats && (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={[styles.focusContent, { fontWeight: 'bold' }]}>Constats :</Text>
                    <Text style={styles.focusContent}>{focus.constats}</Text>
                  </View>
                )}
                {focus.points_forts && (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={[styles.focusContent, { fontWeight: 'bold', color: '#059669' }]}>Points forts :</Text>
                    <Text style={styles.focusContent}>{focus.points_forts}</Text>
                  </View>
                )}
                {focus.points_amelioration && (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={[styles.focusContent, { fontWeight: 'bold', color: '#dc2626' }]}>Points d&apos;amélioration :</Text>
                    <Text style={styles.focusContent}>{focus.points_amelioration}</Text>
                  </View>
                )}
                {focus.propositions && (
                  <View>
                    <Text style={[styles.focusContent, { fontWeight: 'bold', color: '#2563eb' }]}>Propositions :</Text>
                    <Text style={styles.focusContent}>{focus.propositions}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Documentation opérationnelle */}
        {rex.documentation_operationnelle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documentation opérationnelle</Text>
            <Text style={styles.sectionContent}>{stripHtml(rex.documentation_operationnelle)}</Text>
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
