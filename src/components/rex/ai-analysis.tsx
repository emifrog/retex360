'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, FileText, Lightbulb, TrendingUp, Tag, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface AiAnalysisProps {
  rexId: string;
}

type AnalysisType = 'summary' | 'suggestions' | 'patterns' | 'tags';

const analysisConfig = [
  {
    type: 'summary' as AnalysisType,
    label: 'Synthèse',
    icon: FileText,
    description: 'Résumé des points clés',
  },
  {
    type: 'suggestions' as AnalysisType,
    label: 'Suggestions',
    icon: Lightbulb,
    description: "Recommandations d'amélioration",
  },
  {
    type: 'patterns' as AnalysisType,
    label: 'Patterns',
    icon: TrendingUp,
    description: 'Tendances identifiées',
  },
  {
    type: 'tags' as AnalysisType,
    label: 'Tags',
    icon: Tag,
    description: 'Tags suggérés',
  },
] as const;

interface AnalysisResult {
  type: AnalysisType;
  content: string;
  loading: boolean;
}

export function AiAnalysis({ rexId }: AiAnalysisProps) {
  const [analyses, setAnalyses] = useState<Record<AnalysisType, AnalysisResult>>({
    summary: { type: 'summary', content: '', loading: false },
    suggestions: { type: 'suggestions', content: '', loading: false },
    patterns: { type: 'patterns', content: '', loading: false },
    tags: { type: 'tags', content: '', loading: false },
  });

  const runAnalysis = async (type: AnalysisType) => {
    setAnalyses((prev) => ({
      ...prev,
      [type]: { ...prev[type], loading: true },
    }));

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rexId, type }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'analyse");
      }

      const data = await response.json();
      setAnalyses((prev) => ({
        ...prev,
        [type]: { type, content: data.analysis, loading: false },
      }));
    } catch (error) {
      logger.error('Analysis error:', error);
      toast.error("Erreur lors de l'analyse IA");
      setAnalyses((prev) => ({
        ...prev,
        [type]: { ...prev[type], loading: false },
      }));
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Analyse IA
          <Badge
            variant="outline"
            className="ml-2 text-xs bg-primary/10 text-primary border-primary/30"
          >
            Mistral AI
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" className="w-full">
          {/* Deux colonnes sur téléphone, quatre à partir de `sm`. En quatre
              colonnes sur 375 px, chaque onglet dispose d'environ 80 px pour une
              icône et un libellé comme « Suggestions », que `whitespace-nowrap`
              empêche de passer à la ligne : le texte débordait.
              `h-auto` est nécessaire sur mobile — la hauteur `h-9` du composant
              est prévue pour une seule rangée et écraserait la seconde. */}
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-9 gap-[3px] sm:gap-0 mb-4">
            {analysisConfig.map(({ type, label, icon: Icon }) => (
              <TabsTrigger key={type} value={type} className="text-xs py-1.5">
                <Icon className="w-3 h-3 mr-1" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {analysisConfig.map(({ type, description }) => (
            <TabsContent key={type} value={type} className="space-y-3">
              <p className="text-xs text-muted-foreground">{description}</p>

              {analyses[type].content ? (
                <div className="space-y-3">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    {type === 'tags' ? (
                      <div className="flex flex-wrap gap-2">
                        {analyses[type].content.split(',').map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{analyses[type].content}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => runAnalysis(type)}
                    disabled={analyses[type].loading}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Régénérer
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => runAnalysis(type)}
                  disabled={analyses[type].loading}
                  className="w-full"
                  variant="outline"
                >
                  {analyses[type].loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Lancer l&apos;analyse
                    </>
                  )}
                </Button>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
