import { readFileSync } from 'fs';
import path from 'path';
import { rexFormDefaults, rexToFormData } from '@/lib/rex-form-data';

/**
 * Reprise d'un REX dans le formulaire.
 *
 * La page d'édition construisait `initialData` à la main, champ par champ.
 * Neuf rubriques ajoutées après coup n'y figuraient pas : le formulaire les
 * initialisait à vide, et l'enregistrement écrivait ce vide en base. Corriger
 * le titre d'un brouillon effaçait son lieu, ses témoignages et les trois
 * rubriques propres au RETEX.
 */
describe('rexToFormData', () => {
  it.each([
    ['intervention_heure', '06:30:00'],
    ['localisation', 'A8, PK 47, sens Nice-Aix'],
    ['commune', 'Antibes'],
    ['objectifs', '<p>Établir pourquoi le produit a mis deux heures à être identifié.</p>'],
    ['donnees_sources', '<p>Main courante, enregistrements radio, entretiens.</p>'],
    ['methode_argumentation', '<p>Analyse chronologique croisée.</p>'],
    ['description_site', '<p>Section à trois voies, sans bassin de rétention.</p>'],
  ])('reprend la rubrique %s', (field, value) => {
    expect(rexToFormData({ [field]: value })).toMatchObject({ [field]: value });
  });

  it('reprend les témoignages et les ressources complémentaires', () => {
    const temoignages = [{ id: 't1', auteur: 'Chef CMIC', contenu: 'Plaque illisible.' }];
    const ressources = [{ id: 'r1', titre: 'GDO TMD', type: 'gdo', url_ou_reference: 'GDO-2019' }];
    const data = rexToFormData({
      temoignages: temoignages as never,
      ressources_complementaires: ressources as never,
    });
    expect(data.temoignages).toEqual(temoignages);
    expect(data.ressources_complementaires).toEqual(ressources);
  });

  it('ne laisse tomber AUCUN champ du formulaire, y compris ceux qui seront ajoutés plus tard', () => {
    // Garde générique : pour chaque champ que le formulaire connaît, une valeur
    // présente sur la ligne doit se retrouver dans le formulaire. Un champ
    // ajouté à `rexFormDefaults` sans être repris ici ferait échouer ce test.
    for (const key of Object.keys(rexFormDefaults())) {
      const sentinel = `valeur-${key}`;
      const data = rexToFormData({ [key]: sentinel } as never) as unknown as Record<
        string,
        unknown
      >;
      expect(data[key]).toBe(sentinel);
    }
  });

  it('remplace une valeur NULL de la base par la valeur vide du formulaire', () => {
    const data = rexToFormData({ commune: null, temoignages: null, key_figures: null });
    expect(data.commune).toBe('');
    expect(data.temoignages).toEqual([]);
    expect(data.key_figures).toEqual({});
  });

  it('garde les valeurs par défaut du formulaire pour un REX sans visibilité ni type', () => {
    const data = rexToFormData({});
    expect(data.visibility).toBe('sdis');
    expect(data.type_production).toBe('retex');
  });
});

describe('câblage du formulaire', () => {
  const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');

  it("la page d'édition passe par rexToFormData, pas par une liste écrite à la main", () => {
    const page = read('src/app/(dashboard)/rex/[id]/edit/page.tsx');
    expect(page).toMatch(/rexToFormData\(rex\)/);
    expect(page).not.toMatch(/const initialData = \{/);
  });

  it('le formulaire tire ses valeurs initiales de rexFormDefaults', () => {
    expect(read('src/components/rex/rex-form.tsx')).toMatch(/rexFormDefaults\(initialData\)/);
  });
});
