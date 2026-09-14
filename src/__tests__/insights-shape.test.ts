/**
 * @jest-environment node
 *
 * `coerceInsights` est le garde qui empêche une réponse de modèle mal formée
 * d'atteindre le rendu. Sans lui, un `{"insights": [...]}` — JSON valide, forme
 * inattendue — traversait le `data.insights || []` du composant, parce qu'un
 * objet est « truthy », et faisait échouer le `.map` suivant : le tableau de
 * bord tombait sur sa frontière d'erreur, pour tout le SDIS et pendant la demi-
 * heure de cache.
 *
 * C'est une fonction pure qui garde une décision d'affichage : elle est tenue au
 * même niveau d'exigence que les autres gardes du projet.
 */
import { coerceInsights } from '@/lib/insights-shape';

const valid = {
  type: 'pattern',
  text: 'Trois feux de hangar agricole en six semaines sur le même groupement.',
  priority: 'high',
};

describe('coerceInsights', () => {
  it('accepte le tableau nu demandé par le prompt', () => {
    expect(coerceInsights([valid])).toEqual([valid]);
  });

  it('déballe la forme enveloppée que les modèles produisent spontanément', () => {
    // Le cas qui a réellement cassé la production.
    expect(coerceInsights({ insights: [valid] })).toEqual([valid]);
    expect(coerceInsights({ data: [valid] })).toEqual([valid]);
    expect(coerceInsights({ results: [valid] })).toEqual([valid]);
  });

  it('rend une liste vide pour un objet sans enveloppe reconnue', () => {
    expect(coerceInsights({ foo: 'bar' })).toEqual([]);
    expect(coerceInsights(valid)).toEqual([]);
  });

  it('rend une liste vide pour tout ce qui n’est pas exploitable', () => {
    expect(coerceInsights(null)).toEqual([]);
    expect(coerceInsights(undefined)).toEqual([]);
    expect(coerceInsights('texte libre')).toEqual([]);
    expect(coerceInsights(42)).toEqual([]);
    expect(coerceInsights([])).toEqual([]);
  });

  it('écarte les entrées dont un champ manque ou sort de l’énumération', () => {
    expect(
      coerceInsights([
        valid,
        { type: 'pattern', text: 'sans priorité' },
        { type: 'inconnu', text: 'type hors énumération', priority: 'high' },
        { type: 'alert', text: '   ', priority: 'low' },
        { type: 'alert', text: 'priorité hors énumération', priority: 'urgente' },
        'une chaîne',
        null,
        ['un tableau imbriqué'],
      ])
    ).toEqual([valid]);
  });

  it('borne à trois entrées, comme le demande le prompt', () => {
    const five = [1, 2, 3, 4, 5].map((n) => ({ ...valid, text: `Insight ${n}` }));
    const out = coerceInsights(five);
    expect(out).toHaveLength(3);
    expect(out[2].text).toBe('Insight 3');
  });
});
