import 'dotenv/config'
import { randomUUID } from 'crypto'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be defined to run the seed script')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const sdisInsert = await client.query(
      `INSERT INTO "sdis" (
        "id", "code", "name", "department", "region", "plan", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "department" = EXCLUDED."department",
        "region" = EXCLUDED."region",
        "plan" = EXCLUDED."plan",
        "updatedAt" = NOW()
      RETURNING "id", "code"` ,
      [
        randomUUID(),
        'SDIS06',
        'SDIS des Alpes-Maritimes',
        '06',
        'PACA',
        'PROFESSIONAL',
      ]
    )

    const sdis = sdisInsert.rows[0]
    console.log('✅ SDIS 06 prêt:', sdis.code)

    const hashedPassword = await bcrypt.hash('password123', 10)

    const userInsert = await client.query(
      `INSERT INTO "users" (
        "id", "email", "name", "password", "role", "sdisId", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT ("email") DO UPDATE SET
        "name" = EXCLUDED."name",
        "role" = EXCLUDED."role",
        "sdisId" = EXCLUDED."sdisId",
        "updatedAt" = NOW()
      RETURNING "id", "email"`,
      [
        randomUUID(),
        'xavier@sdis06.fr',
        'Xavier Durand',
        hashedPassword,
        'OFFICER',
        sdis.id,
      ]
    )

    const user = userInsert.rows[0]
    console.log('✅ Utilisateur test prêt:', user.email)
    console.log('   Email: xavier@sdis06.fr')
    console.log('   Password: password123')

    const rexInsert = await client.query(
      `INSERT INTO "rex" (
        "id", "title", "description", "type", "severity", "status",
        "interventionDate", "location", "context", "actions", "outcome",
        "lessons", "recommendations", "category", "tags", "authorId", "sdisId",
        "views", "aiSummary", "aiKeywords", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17,
        $18, $19, $20, NOW(), NOW()
      )
      RETURNING "title"`,
      [
        randomUUID(),
        "Feu d'appartement avec sauvetage de 3 personnes",
        "Intervention complexe avec plusieurs facteurs aggravants : étage élevé, personnes âgées, fumée dense. Sauvetage réussi grâce à la coordination EPA/SAP.",
        'INCIDENT',
        'HIGH',
        'PUBLISHED',
        new Date('2025-11-15'),
        'Nice, Rue de France',
        "Alerte reçue à 14h23 pour feu d'appartement avec personnes à sauver. Immeuble ancien de 8 étages. Premiers témoins signalent des flammes visibles au 8ème étage.",
        "Phase 1 - Reconnaissance (14h28): Établissement 2 lignes d'eau préventives. Reconnaissance EPA avec caméra thermique. Phase 2 - Sauvetages (14h35): Extraction enfant 8 ans par binôme SAP + protection EPA.",
        'Sauvetage réussi des 3 victimes (inhalation de fumée légère, prise en charge SAP). Feu maîtrisé en 45 minutes. Pas de blessés parmi les intervenants.',
        'Coordination EPA/SAP excellente. Caméra thermique décisive pour localisation rapide des victimes malgré l\'enfumage important.',
        "Systématiser l'utilisation de la caméra thermique dès la reconnaissance. Organiser exercices conjoints EPA/SAP.",
        'FIRE',
        ['incendie', 'sauvetage', 'coordination', 'EPA', 'SAP'],
        user.id,
        sdis.id,
        124,
        "Intervention complexe sur feu d'appartement au 8ème étage avec 3 personnes piégées. Coordination réussie entre EPA et SAP. Points clés : utilisation caméra thermique, priorisation des sauvetages.",
        ['feu appartement', 'sauvetage', 'coordination', 'caméra thermique'],
      ]
    )

    console.log('✅ REX exemple créé:', rexInsert.rows[0].title)

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

main()
  .catch((error) => {
    console.error('❌ Échec du seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
  })