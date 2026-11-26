import { isInUploaderFolder, purgeablePaths, thumbnailPathFor } from '@/lib/attachment-paths';

const ALICE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BOB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

/**
 * Les routes de suppression purgent les fichiers avec le rôle service, qui
 * ignore toute règle d'accès. Elles ne doivent donc effacer que des objets
 * situés dans le dossier de celui qui a déposé la ligne : une ligne forgée
 * pointant vers le fichier d'un autre ne doit rien détruire.
 */
describe('isInUploaderFolder', () => {
  it('reconnaît un fichier du dossier du déposant', () => {
    expect(isInUploaderFolder(`rex-attachments/${ALICE}/1700000000-ab12.webp`, ALICE)).toBe(true);
  });

  it("refuse un fichier du dossier d'un autre", () => {
    expect(isInUploaderFolder(`rex-attachments/${BOB}/1700000000-ab12.webp`, ALICE)).toBe(false);
  });

  it('refuse un chemin qui remonte dans un autre dossier', () => {
    expect(isInUploaderFolder(`rex-attachments/${ALICE}/../${BOB}/x.webp`, ALICE)).toBe(false);
  });

  it('refuse un préfixe qui ne fait que ressembler au dossier', () => {
    expect(isInUploaderFolder(`rex-attachments/${ALICE}-bis/x.webp`, ALICE)).toBe(false);
  });

  it('refuse une ligne sans déposant', () => {
    expect(isInUploaderFolder(`rex-attachments/${ALICE}/x.webp`, null)).toBe(false);
  });
});

describe('purgeablePaths', () => {
  it('rend le fichier et sa vignette pour une ligne légitime', () => {
    const path = `rex-attachments/${ALICE}/photo.webp`;
    expect(purgeablePaths([{ storage_path: path, uploaded_by: ALICE }])).toEqual([
      path,
      thumbnailPathFor(path),
    ]);
  });

  it("écarte une ligne pointant vers le fichier d'un autre", () => {
    expect(
      purgeablePaths([
        { storage_path: `rex-attachments/${ALICE}/a.webp`, uploaded_by: ALICE },
        { storage_path: `rex-attachments/${ALICE}/vole.webp`, uploaded_by: BOB },
      ])
    ).toEqual([`rex-attachments/${ALICE}/a.webp`, `rex-attachments/${ALICE}/a_thumb.webp`]);
  });

  it('rend une liste vide quand rien ne peut être purgé', () => {
    expect(purgeablePaths([])).toEqual([]);
  });
});
