export interface Insight {
  type: 'pattern' | 'suggestion' | 'alert';
  text: string;
  priority: 'high' | 'medium' | 'low';
}

const INSIGHT_TYPES = ['pattern', 'suggestion', 'alert'];
const INSIGHT_PRIORITIES = ['high', 'medium', 'low'];
const MAX_INSIGHTS = 3;

/**
 * Ramène la réponse du modèle à une liste d'insights affichables, ou à rien.
 *
 * Le `JSON.parse` de la route ne se protégeait que du JSON INVALIDE. Or un
 * modèle répond très volontiers un JSON parfaitement valide mais de la mauvaise
 * forme — le plus souvent `{"insights": [...]}` au lieu du tableau nu demandé
 * par le prompt. Cet objet était renvoyé tel quel sous la clé `insights`, et le
 * composant faisait `data.insights || []` : un objet étant « truthy », il
 * franchissait le garde et faisait échouer le `.map` suivant. Le tableau de bord
 * tombait alors sur sa frontière d'erreur, avec « Impossible de charger cette
 * page ».
 *
 * Deux choses aggravaient le cas. Le résultat est MIS EN CACHE une demi-heure
 * par SDIS : une seule réponse malformée cassait la page pour tout le service
 * jusqu'à expiration. Et le modèle étant non déterministe, le défaut
 * n'apparaissait que sur certains environnements — reproductible en production,
 * invisible en local.
 *
 * On accepte donc le tableau nu comme la forme enveloppée, on ne garde que les
 * entrées réellement affichables, et tout le reste devient une liste vide : le
 * bloc montre son état vide, ce qu'il sait déjà faire.
 */
export function coerceInsights(parsed: unknown): Insight[] {
  let list: unknown = parsed;

  // Enveloppes courantes des modèles quand on leur demande un tableau nu.
  if (list && !Array.isArray(list) && typeof list === 'object') {
    const wrapper = list as Record<string, unknown>;
    list = wrapper.insights ?? wrapper.data ?? wrapper.results;
  }

  if (!Array.isArray(list)) return [];

  return list
    .filter((item): item is Insight => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      const i = item as Record<string, unknown>;
      return (
        typeof i.text === 'string' &&
        i.text.trim().length > 0 &&
        typeof i.type === 'string' &&
        INSIGHT_TYPES.includes(i.type) &&
        typeof i.priority === 'string' &&
        INSIGHT_PRIORITIES.includes(i.priority)
      );
    })
    .slice(0, MAX_INSIGHTS);
}
