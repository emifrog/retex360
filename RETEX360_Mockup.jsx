import React, { useState } from 'react';

const RETEX_DATA = [
  { id: 1, title: "Feu d'entrepôt chimique - Zone industrielle Carros", date: "2024-11-15", sdis: "SDIS 06", type: "Incendie industriel", severity: "critique", validated: true, views: 234, tags: ["NRBC", "POI", "multi-sites"] },
  { id: 2, title: "Effondrement parking souterrain - Nice Centre", date: "2024-10-28", sdis: "SDIS 06", type: "Sauvetage déblaiement", severity: "majeur", validated: true, views: 189, tags: ["USAR", "cynophile", "extraction"] },
  { id: 3, title: "Feux de forêt simultanés - Massif de l'Estérel", date: "2024-08-12", sdis: "SDIS 83", type: "FDF", severity: "critique", validated: true, views: 456, tags: ["colonnes", "coordination", "aérien"] },
  { id: 4, title: "Accident TMD A8 - Produit inconnu", date: "2024-09-05", sdis: "SDIS 06", type: "NRBC", severity: "majeur", validated: true, views: 312, tags: ["TMD", "périmètre", "décontamination"] },
  { id: 5, title: "Noyade collective plage Antibes", date: "2024-07-22", sdis: "SDIS 06", type: "SAV", severity: "significatif", validated: false, views: 45, tags: ["SAV", "afflux", "coordination secours"] },
];

const AI_INSIGHTS = [
  { type: "pattern", text: "Défaut de liaison radio récurrent lors des opérations multi-sites (12 occurrences en 6 mois)", priority: "high" },
  { type: "suggestion", text: "Procédure de reconnaissance initiale FDF : 3 SDIS suggèrent l'utilisation systématique de drones thermiques", priority: "medium" },
  { type: "alert", text: "Augmentation 40% des interventions TMD sur A8 - Révision PPI recommandée", priority: "high" },
];

export default function MemoOpsApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRetex, setSelectedRetex] = useState(null);
  const [showNewRetex, setShowNewRetex] = useState(false);

  const filteredRetex = RETEX_DATA.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getSeverityColor = (severity) => {
    const colors = { critique: '#ef4444', majeur: '#f97316', significatif: '#eab308' };
    return colors[severity] || '#6b7280';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d0d14 100%)',
      color: '#e2e8f0',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(90deg, rgba(185,28,28,0.15) 0%, rgba(10,10,15,0.95) 50%, rgba(185,28,28,0.15) 100%)',
        borderBottom: '1px solid rgba(185,28,28,0.4)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(185,28,28,0.4)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: '700',
              background: 'linear-gradient(90deg, #ffffff 0%, #b91c1c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '2px'
            }}>RETEX360</h1>
            <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', letterSpacing: '3px', textTransform: 'uppercase' }}>
              Plateforme RETEX Collaborative
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '6px'
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '12px', color: '#22c55e' }}>SDIS 06 Connecté</span>
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
            border: '2px solid #b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '600'
          }}>XL</div>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 76px)' }}>
        {/* Sidebar */}
        <nav style={{
          width: '240px',
          background: 'rgba(15,15,20,0.8)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          padding: '20px 12px'
        }}>
          {[
            { id: 'dashboard', icon: '◉', label: 'Tableau de bord' },
            { id: 'search', icon: '⌕', label: 'Recherche RETEX' },
            { id: 'new', icon: '+', label: 'Nouveau RETEX' },
            { id: 'analytics', icon: '◈', label: 'Analyses IA' },
            { id: 'validation', icon: '✓', label: 'Validation' },
            { id: 'settings', icon: '⚙', label: 'Paramètres' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => item.id === 'new' ? setShowNewRetex(true) : setActiveTab(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                marginBottom: '4px',
                background: activeTab === item.id ? 'rgba(185,28,28,0.2)' : 'transparent',
                border: activeTab === item.id ? '1px solid rgba(185,28,28,0.4)' : '1px solid transparent',
                borderRadius: '8px',
                color: activeTab === item.id ? '#f87171' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
          
          <div style={{ 
            marginTop: '32px', 
            padding: '16px',
            background: 'rgba(185,28,28,0.1)',
            border: '1px solid rgba(185,28,28,0.2)',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '11px', color: '#f87171', margin: '0 0 8px 0', fontWeight: '600' }}>
              ◈ INSIGHT IA
            </p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
              3 patterns similaires détectés avec votre dernière intervention
            </p>
          </div>
        </nav>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
          {activeTab === 'dashboard' && (
            <>
              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                  { label: 'RETEX Total', value: '1,247', trend: '+23 ce mois', color: '#3b82f6' },
                  { label: 'SDIS Participants', value: '14', trend: 'Région PACA', color: '#22c55e' },
                  { label: 'En attente validation', value: '8', trend: '3 urgents', color: '#f97316' },
                  { label: 'Patterns IA détectés', value: '47', trend: '+5 cette semaine', color: '#a855f7' },
                ].map((stat, i) => (
                  <div key={i} style={{
                    background: 'rgba(20,20,28,0.8)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: `linear-gradient(90deg, ${stat.color} 0%, transparent 100%)`
                    }} />
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {stat.label}
                    </p>
                    <p style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 4px 0', color: '#fff' }}>
                      {stat.value}
                    </p>
                    <p style={{ fontSize: '11px', color: stat.color, margin: 0 }}>{stat.trend}</p>
                  </div>
                ))}
              </div>

              {/* Search Bar */}
              <div style={{
                background: 'rgba(20,20,28,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '20px', color: '#64748b' }}>⌕</span>
                <input
                  type="text"
                  placeholder="Recherche sémantique : type d'intervention, contexte, enseignements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#e2e8f0',
                    fontSize: '14px'
                  }}
                />
                <button style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}>
                  Rechercher
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* RETEX List */}
                <div>
                  <h2 style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    RETEX Récents
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredRetex.map(retex => (
                      <div
                        key={retex.id}
                        onClick={() => setSelectedRetex(retex)}
                        style={{
                          background: 'rgba(20,20,28,0.8)',
                          border: selectedRetex?.id === retex.id ? '1px solid rgba(185,28,28,0.6)' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '12px',
                          padding: '16px 20px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: getSeverityColor(retex.severity),
                              boxShadow: `0 0 10px ${getSeverityColor(retex.severity)}40`
                            }} />
                            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
                              {retex.type}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {retex.validated && (
                              <span style={{
                                padding: '2px 8px',
                                background: 'rgba(34,197,94,0.15)',
                                border: '1px solid rgba(34,197,94,0.3)',
                                borderRadius: '4px',
                                fontSize: '10px',
                                color: '#22c55e'
                              }}>✓ Validé</span>
                            )}
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{retex.views} vues</span>
                          </div>
                        </div>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 8px 0', color: '#f1f5f9' }}>
                          {retex.title}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{retex.sdis}</span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{retex.date}</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {retex.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} style={{
                                padding: '2px 8px',
                                background: 'rgba(100,116,139,0.2)',
                                borderRadius: '4px',
                                fontSize: '10px',
                                color: '#94a3b8'
                              }}>{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Insights Panel */}
                <div>
                  <h2 style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    ◈ Analyses IA
                  </h2>
                  <div style={{
                    background: 'rgba(20,20,28,0.8)',
                    border: '1px solid rgba(168,85,247,0.2)',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    {AI_INSIGHTS.map((insight, i) => (
                      <div key={i} style={{
                        padding: '12px',
                        marginBottom: i < AI_INSIGHTS.length - 1 ? '12px' : 0,
                        background: insight.priority === 'high' ? 'rgba(239,68,68,0.1)' : 'rgba(168,85,247,0.1)',
                        border: `1px solid ${insight.priority === 'high' ? 'rgba(239,68,68,0.3)' : 'rgba(168,85,247,0.2)'}`,
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ 
                            fontSize: '10px', 
                            textTransform: 'uppercase',
                            color: insight.type === 'pattern' ? '#a855f7' : insight.type === 'alert' ? '#ef4444' : '#3b82f6',
                            fontWeight: '600'
                          }}>
                            {insight.type === 'pattern' ? '◉ Pattern' : insight.type === 'alert' ? '⚠ Alerte' : '◈ Suggestion'}
                          </span>
                          {insight.priority === 'high' && (
                            <span style={{
                              padding: '1px 6px',
                              background: 'rgba(239,68,68,0.3)',
                              borderRadius: '4px',
                              fontSize: '9px',
                              color: '#ef4444'
                            }}>PRIORITAIRE</span>
                          )}
                        </div>
                        <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>
                          {insight.text}
                        </p>
                      </div>
                    ))}
                    
                    <button style={{
                      width: '100%',
                      marginTop: '16px',
                      padding: '10px',
                      background: 'linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(168,85,247,0.1) 100%)',
                      border: '1px solid rgba(168,85,247,0.3)',
                      borderRadius: '8px',
                      color: '#a855f7',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}>
                      Voir toutes les analyses →
                    </button>
                  </div>
                  
                  {/* Quick Actions */}
                  <div style={{
                    marginTop: '20px',
                    background: 'rgba(20,20,28,0.8)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <h3 style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase' }}>
                      Actions rapides
                    </h3>
                    <button
                      onClick={() => setShowNewRetex(true)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        marginBottom: '8px',
                        background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        boxShadow: '0 4px 12px rgba(185,28,28,0.3)'
                      }}
                    >
                      + Créer un RETEX
                    </button>
                    <button style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(59,130,246,0.1)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      borderRadius: '8px',
                      color: '#3b82f6',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}>
                      Exporter statistiques
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'analytics' && (
            <div>
              <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>◈ Analyses IA & Patterns</h2>
              <div style={{
                background: 'rgba(20,20,28,0.8)',
                border: '1px solid rgba(168,85,247,0.2)',
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>◈</div>
                <p style={{ color: '#a855f7', fontSize: '16px', marginBottom: '8px' }}>Module d&apos;analyse IA</p>
                <p style={{ color: '#64748b', fontSize: '13px' }}>
                  Identification automatique des patterns récurrents, détection d&apos;anomalies<br/>
                  et suggestions d&apos;amélioration basées sur le corpus RETEX
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New RETEX Modal */}
      {showNewRetex && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            width: '600px',
            maxHeight: '80vh',
            background: 'linear-gradient(135deg, #14141c 0%, #1a1a24 100%)',
            border: '1px solid rgba(185,28,28,0.3)',
            borderRadius: '16px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Nouveau RETEX</h2>
              <button
                onClick={() => setShowNewRetex(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >×</button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              {[
                { label: "Intitulé de l'intervention", type: 'text', placeholder: "Ex: Feu d'habitation R+3 - Centre-ville Nice" },
                { label: "Date de l'intervention", type: 'date' },
                { label: "Type d'intervention", type: 'select', options: ['Incendie urbain', 'FDF', 'SAV', 'NRBC', 'Sauvetage déblaiement', 'Autre'] },
                { label: "Niveau de criticité", type: 'select', options: ['Significatif', 'Majeur', 'Critique'] },
              ].map((field, i) => (
                <div key={i} style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(30,30,40,0.8)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                      fontSize: '14px'
                    }}>
                      <option value="">Sélectionner...</option>
                      {field.options.map((opt, j) => <option key={j} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      placeholder={field.placeholder || ''}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(30,30,40,0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#e2e8f0',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  )}
                </div>
              ))}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Synthèse & Enseignements
                </label>
                <textarea
                  rows={5}
                  placeholder="Décrivez le contexte, les difficultés rencontrées et les enseignements à retenir..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(30,30,40,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  onClick={() => setShowNewRetex(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >Annuler</button>
                <button style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}>Soumettre pour validation</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        input::placeholder, textarea::placeholder {
          color: #4b5563;
        }
        select, input, textarea, button {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}
