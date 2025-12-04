'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  FileText, 
  Lightbulb, 
  TrendingUp, 
  Tag,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface AiAnalysisProps {
  rexId: string;
}

type AnalysisType = 'summary' | 'suggestions' | 'patterns' | 'tags';

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
    setAnalyses(prev => ({
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
        throw new Error('Erreur lors de l\'analyse');
      }

      const data = await response.json();
      setAnalyses(prev => ({
        ...prev,
        [type]: { type, content: data.analysis, loading: false },
      }));
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Erreur lors de l\'analyse IA');
      setAnalyses(prev => ({
        ...prev,
        [type]: { ...prev[type], loading: false },
      }));
    }
  };

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
      description: 'Recommandations d\'amélioration',
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
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Analyse IA
          <Badge variant="outline" className="ml-2 text-[10px] bg-primary/10 text-primary border-primary/30">
            OpenRouter
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            {analysisConfig.map(({ type, label, icon: Icon }) => (
              <TabsTrigger key={type} value={type} className="text-xs">
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
