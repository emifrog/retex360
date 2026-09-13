/**
 * Régénération des embeddings de REX (migration 022 : 1536 → 1024 dimensions).
 *
 * À lancer APRÈS la migration 022, qui vide la colonne `embedding` — un vecteur
 * de 1536 dimensions ne se convertit pas en 1024, et un embedding se recalcule
 * intégralement depuis le contenu du REX.
 *
 *   npx tsx supabase/maintenance/regenerate_embeddings.ts            # exécution
 *   npx tsx supabase/maintenance/regenerate_embeddings.ts --dry-run  # compte seulement
 *   npx tsx supabase/maintenance/regenerate_embeddings.ts --limit 50 # échantillon
 *
 * REPRENABLE. Ne traite que les REX dont `embedding IS NULL` : une coupure en
 * cours de route ne coûte que le lot en vol, et relancer reprend où l'on s'est
 * arrêté. Aucun embedding déjà calculé n'est recalculé (donc repayé).
 *
 * PENDANT L'EXÉCUTION. La recherche sémantique ne trouve rien sur les REX non
 * encore traités ; `/api/search` retombe alors sur le plein texte. La recherche
 * reste donc utilisable tout du long, simplement moins fine.
 *
 * APRÈS. Reconstruire l'index, dont les centroïdes ont été calculés sur une
 * table vide et ne servent à rien en l'état :
 *
 *   REINDEX INDEX rex_embedding_idx;
 */
import { createClient } from '@supabase/supabase-js';
import {
  generateRexEmbedding,
  EMBEDDING_DIMENSIONS,
  isEmbeddingConfigured,
} from '../../src/lib/llm';

/** Lu en un seul appel ; les REX sont traités séquentiellement ensuite. */
const BATCH_SIZE = 25;

/**
 * Pause entre deux appels au fournisseur. Une régénération est un traitement de
 * fond : rien ne justifie d'y consommer le quota d'API au détriment des
 * utilisateurs en train de se servir de l'application.
 */
const DELAY_MS = 250;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.indexOf('--limit');
const maxRex = limitArg !== -1 ? Number(args[limitArg + 1]) : Infinity;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ Variable d'environnement manquante : ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  if (!dryRun && !isEmbeddingConfigured()) {
    console.error('✗ MISTRAL_API_KEY absente — impossible de calculer les embeddings.');
    process.exit(1);
  }

  // Rôle service : le script tourne hors session utilisateur et doit voir les
  // REX de tous les SDIS. Il n'écrit que la colonne `embedding`.
  const supabase = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const [{ count: remaining, error: countError }, { count: total }] = await Promise.all([
    supabase.from('rex').select('id', { count: 'exact', head: true }).is('embedding', null),
    supabase.from('rex').select('id', { count: 'exact', head: true }),
  ]);

  if (countError) {
    console.error('✗ Lecture du compte impossible :', countError.message);
    process.exit(1);
  }

  console.log(`REX à traiter : ${remaining ?? 0} sur ${total ?? 0}`);
  console.log(`Modèle : mistral-embed (${EMBEDDING_DIMENSIONS} dimensions)`);
  // Une seconde par REX est une estimation volontairement large : un appel au
  // fournisseur plus la pause de courtoisie entre deux.
  if (remaining) {
    console.log(`Durée estimée : ~${Math.ceil((remaining * (DELAY_MS + 750)) / 60_000)} min`);
  }

  if (dryRun) {
    console.log('\n--dry-run : rien n’a été écrit.');
    return;
  }
  if (!remaining) {
    console.log('\nRien à faire.');
    return;
  }

  let done = 0;
  let failed = 0;
  const startedAt = Date.now();

  // Pas de pagination par offset : chaque lot traité cesse de correspondre au
  // filtre `embedding IS NULL`, donc un offset ferait sauter des lignes. On
  // relit toujours le début de ce qui reste.
  for (;;) {
    if (done + failed >= maxRex) break;

    const { data: batch, error } = await supabase
      .from('rex')
      .select('id, title, description, context, lessons_learned, tags')
      .is('embedding', null)
      .limit(Math.min(BATCH_SIZE, maxRex - done - failed));

    if (error) {
      console.error('✗ Lecture du lot impossible :', error.message);
      process.exit(1);
    }
    if (!batch || batch.length === 0) break;

    for (const rex of batch) {
      try {
        const embedding = await generateRexEmbedding(rex);
        const { error: updateError } = await supabase
          .from('rex')
          .update({ embedding })
          .eq('id', rex.id);

        if (updateError) throw new Error(updateError.message);

        done++;
        process.stdout.write(
          `\r  ${done} traité(s), ${failed} en échec — ${Math.round((Date.now() - startedAt) / 1000)}s`
        );
      } catch (err) {
        failed++;
        // On continue : un REX en échec (contenu vide, coupure réseau) ne doit
        // pas interrompre la reprise des autres. Il restera à NULL et sera
        // repris au prochain passage.
        console.error(`\n  ✗ ${rex.id} (${rex.title ?? 'sans titre'}) : ${(err as Error).message}`);
      }
      await sleep(DELAY_MS);
    }
  }

  const seconds = Math.round((Date.now() - startedAt) / 1000);
  console.log(`\n\n✓ ${done} embedding(s) régénéré(s) en ${seconds}s, ${failed} en échec.`);

  if (failed > 0) {
    console.log('  Relancer le script reprendra les REX en échec.');
  }
  if (done > 0) {
    console.log('\n→ Reconstruire l’index : REINDEX INDEX rex_embedding_idx;');
  }
}

main().catch((error) => {
  console.error('\n✗ Échec :', error);
  process.exit(1);
});
