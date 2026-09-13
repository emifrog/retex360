/**
 * Vérification de bout en bout de la recherche sémantique.
 *
 *   npm run embeddings:check
 *   npm run embeddings:check -- "feu de forêt par vent fort"
 *
 * Contrôle ce que les tests unitaires ne peuvent pas : que le fournisseur, la
 * dimension de la colonne et la fonction SQL s'accordent réellement. C'est
 * exactement ce qui a échoué en silence une première fois — le SDK renvoyait
 * des vecteurs de 256 zéros au lieu de 1024 valeurs.
 *
 * À relancer après toute migration touchant `rex.embedding`, tout changement de
 * modèle d'embedding, et après un déploiement.
 *
 * ⚠️ Utilise le rôle service : la RLS est contournée, donc les résultats ne
 * reflètent PAS le cloisonnement par SDIS que verrait un utilisateur réel. Le
 * but est de vérifier la mécanique, pas les autorisations (couvertes par les
 * tests RLS).
 */
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from '../../src/lib/llm';

const DEFAULT_QUERY = "incendie dans un bâtiment avec difficulté d'accès des secours";
const MATCH_THRESHOLD = 0.5;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ Variable d'environnement manquante : ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const query = process.argv.slice(2).join(' ') || DEFAULT_QUERY;

  const supabase = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Le fournisseur rend-il un vecteur de la bonne taille ?
  const embedding = await generateEmbedding(query);
  const nonZero = embedding.filter((v) => v !== 0).length;
  console.log(`Modèle          ${EMBEDDING_MODEL}`);
  console.log(`Dimensions      ${embedding.length} (attendu ${EMBEDDING_DIMENSIONS})`);
  // Un vecteur entièrement nul est la signature de la corruption d'encodage :
  // la taille peut être juste alors que le contenu ne veut rien dire.
  console.log(`Valeurs non nulles  ${nonZero} / ${embedding.length}`);
  if (nonZero === 0) {
    console.error('\n✗ Vecteur entièrement nul — le contenu est corrompu, pas seulement la taille.');
    process.exit(1);
  }

  // 2. Le corpus est-il indexé ?
  const [{ count: indexed }, { count: total }] = await Promise.all([
    supabase.from('rex').select('id', { count: 'exact', head: true }).not('embedding', 'is', null),
    supabase.from('rex').select('id', { count: 'exact', head: true }),
  ]);
  console.log(`Corpus indexé   ${indexed ?? 0} REX sur ${total ?? 0}`);

  // 3. La fonction SQL accepte-t-elle ce vecteur et rend-elle un classement ?
  const { data: hits, error } = await supabase.rpc('search_rex_by_embedding', {
    query_embedding: embedding,
    match_threshold: MATCH_THRESHOLD,
    match_count: 5,
  });

  if (error) {
    console.error(`\n✗ search_rex_by_embedding : ${error.message}`);
    console.error('  Vérifier que la migration 022 est appliquée et que les dimensions concordent.');
    process.exit(1);
  }

  console.log(`\nRequête : « ${query} »`);
  if (!hits || hits.length === 0) {
    console.log(`\n  Aucun REX au-dessus du seuil de ${MATCH_THRESHOLD}.`);
    console.log('  Mécanique fonctionnelle, mais aucun contenu proche — essayer une autre requête.');
    return;
  }

  const ids = hits.map((h: { id: string }) => h.id);
  const { data: rex } = await supabase.from('rex').select('id, title, status').in('id', ids);
  const byId = new Map((rex ?? []).map((r) => [r.id, r]));

  console.log('');
  for (const hit of hits as { id: string; similarity: number }[]) {
    const r = byId.get(hit.id);
    console.log(
      `  ${(hit.similarity * 100).toFixed(1)} %  ${r?.title ?? hit.id} [${r?.status ?? '?'}]`
    );
  }

  console.log(`\n✓ Recherche sémantique opérationnelle — ${hits.length} résultat(s).`);
}

main().catch((error) => {
  console.error('\n✗ Échec :', error);
  process.exit(1);
});
