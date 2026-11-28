/**
 * @jest-environment node
 */
import {
  normalizeCommentText,
  buildCommentThreads,
  appendReply,
  countComments,
  mentionQueryAt,
  mentionToken,
  extractMentionIds,
  splitMentions,
  canModerateComments,
} from '@/lib/comments';

describe('Commentaires — texte enregistré', () => {
  it('conserve les signes de comparaison tels que saisis', () => {
    // Le texte passait par un assainisseur HTML : « < » devenait « &lt; », et
    // l'écran, qui affiche du texte, montrait l'entité.
    expect(normalizeCommentText('Pression < 8 bar & débit > 500 l/min')).toBe(
      'Pression < 8 bar & débit > 500 l/min'
    );
  });

  it('ne perd pas un passage pris pour une balise', () => {
    // « <Pmin et T> » était lu comme une balise HTML et supprimé avec son
    // contenu : il restait « si PTmax ».
    expect(normalizeCommentText('si P<Pmin et T>Tmax')).toBe('si P<Pmin et T>Tmax');
  });

  it("laisse intact un texte qui ressemble à du HTML : c'est l'affichage qui l'échappe", () => {
    expect(normalizeCommentText('<script>alert(1)</script>')).toBe('<script>alert(1)</script>');
  });

  it('retire les caractères de contrôle, garde les sauts de ligne et les tabulations', () => {
    expect(normalizeCommentText('ligne 1\r\nligne 2\u0000\u0007\tfin')).toBe(
      'ligne 1\nligne 2\tfin'
    );
  });

  it('retire les espaces de début et de fin', () => {
    expect(normalizeCommentText('  \n Bien reçu. \n ')).toBe('Bien reçu.');
    expect(normalizeCommentText(' \n\t ')).toBe('');
  });
});

describe('Commentaires — fils de discussion', () => {
  const c = (id: string, parent_id: string | null, minute: number) => ({
    id,
    parent_id,
    created_at: `2026-11-20T10:${String(minute).padStart(2, '0')}:00Z`,
  });

  it('rattache une réponse à une réponse au fil de premier niveau', () => {
    // Seules les réponses directes étaient rattachées : une réponse à une
    // réponse était enregistrée, puis n'apparaissait nulle part.
    const threads = buildCommentThreads([
      c('racine', null, 0),
      c('reponse', 'racine', 1),
      c('reponse-a-la-reponse', 'reponse', 2),
      c('niveau-3', 'reponse-a-la-reponse', 3),
    ]);
    expect(threads).toHaveLength(1);
    expect(threads[0].replies.map((r) => r.id)).toEqual([
      'reponse',
      'reponse-a-la-reponse',
      'niveau-3',
    ]);
  });

  it('classe les fils du plus récent au plus ancien, et les réponses dans leur ordre', () => {
    const threads = buildCommentThreads([
      c('ancien', null, 0),
      c('r2', 'ancien', 9),
      c('recent', null, 5),
      c('r1', 'ancien', 3),
    ]);
    expect(threads.map((t) => t.id)).toEqual(['recent', 'ancien']);
    expect(threads[1].replies.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it("montre comme un fil à part une réponse dont le parent n'est pas dans la liste", () => {
    const threads = buildCommentThreads([c('orpheline', 'parent-absent', 1), c('racine', null, 0)]);
    expect(threads.map((t) => t.id).sort()).toEqual(['orpheline', 'racine']);
  });

  it('ne boucle pas sur des parents qui se désignent mutuellement', () => {
    const threads = buildCommentThreads([c('a', 'b', 0), c('b', 'a', 1)]);
    expect(countComments(threads)).toBe(2);
  });

  it('compte les réponses avec les commentaires', () => {
    const threads = buildCommentThreads([
      c('racine', null, 0),
      c('r1', 'racine', 1),
      c('r2', 'r1', 2),
      c('autre', null, 3),
    ]);
    expect(countComments(threads)).toBe(4);
  });

  describe('appendReply', () => {
    const threads = buildCommentThreads([c('racine', null, 0), c('r1', 'racine', 1)]);

    it("ajoute au fil une réponse à l'une de ses réponses", () => {
      const next = appendReply(threads, 'r1', c('r2', 'r1', 2));
      expect(next[0].replies.map((r) => r.id)).toEqual(['r1', 'r2']);
    });

    it('ajoute une réponse directe', () => {
      const next = appendReply(threads, 'racine', c('r2', 'racine', 2));
      expect(next[0].replies.map((r) => r.id)).toEqual(['r1', 'r2']);
    });

    it("ne modifie pas la liste d'origine", () => {
      appendReply(threads, 'r1', c('r2', 'r1', 2));
      expect(threads[0].replies).toHaveLength(1);
    });
  });
});

describe('Commentaires — mentions', () => {
  describe('mentionQueryAt', () => {
    it('reconnaît un prénom accentué en cours de saisie', () => {
      // `\w` ne connaît pas les lettres accentuées : « @Jérôme » s'arrêtait à « J ».
      expect(mentionQueryAt('Merci @Jérô')).toEqual({ query: 'Jérô', token: '@Jérô' });
    });

    it('reconnaît un prénom composé', () => {
      expect(mentionQueryAt('@Jean-Pi')).toEqual({ query: 'Jean-Pi', token: '@Jean-Pi' });
    });

    it("s'ouvre dès l'arobase", () => {
      expect(mentionQueryAt('Bonjour @')).toEqual({ query: '', token: '@' });
    });

    it('ne prend pas une adresse de courriel pour une mention', () => {
      expect(mentionQueryAt('écrire à contact@sdis')).toBeNull();
    });

    it('se ferme après une espace', () => {
      expect(mentionQueryAt('@Jérôme ')).toBeNull();
    });
  });

  it('écrit le nom avec des tirets bas à la place des espaces', () => {
    expect(mentionToken('Jérôme De La Tour')).toBe('@Jérôme_De_La_Tour');
  });

  describe('extractMentionIds', () => {
    const known = new Map([
      ['Jérôme Lefèvre', 'id-jerome'],
      ['Jean-Pierre Martin', 'id-jp'],
      ["Anne D'Arcy", 'id-anne'],
    ]);

    it('retrouve les personnes aux noms accentués, composés ou à apostrophe', () => {
      const text = "@Jérôme_Lefèvre et @Jean-Pierre_Martin, vu avec @Anne_D'Arcy.";
      expect(extractMentionIds(text, known)).toEqual(['id-jerome', 'id-jp', 'id-anne']);
    });

    it('ne compte une personne qu’une fois', () => {
      expect(extractMentionIds('@Jérôme_Lefèvre puis @Jérôme_Lefèvre', known)).toEqual([
        'id-jerome',
      ]);
    });

    it('ignore un nom qui ne vient pas de la liste proposée', () => {
      expect(extractMentionIds('@Inconnu_Total', known)).toEqual([]);
    });

    it("retrouve le nom quand il est suivi d'une apostrophe ou d'un tiret", () => {
      expect(extractMentionIds('l’avis de @Jérôme_Lefèvre- à suivre', known)).toEqual([
        'id-jerome',
      ]);
    });
  });

  describe('splitMentions', () => {
    it('sépare le texte et les mentions, espaces rétablies', () => {
      expect(splitMentions('Vu avec @Jérôme_Lefèvre, merci.')).toEqual([
        { kind: 'text', text: 'Vu avec ' },
        { kind: 'mention', text: '@Jérôme Lefèvre' },
        { kind: 'text', text: ', merci.' },
      ]);
    });

    it('laisse une adresse de courriel en texte', () => {
      expect(splitMentions('contact@sdis06.fr')).toEqual([
        { kind: 'text', text: 'contact@sdis06.fr' },
      ]);
    });

    it('rend le texte entier quand il ne contient aucune mention', () => {
      expect(splitMentions('Rien à signaler.')).toEqual([
        { kind: 'text', text: 'Rien à signaler.' },
      ]);
    });
  });
});

describe('Commentaires — modération', () => {
  it("l'admin du SDIS du REX peut modérer", () => {
    expect(canModerateComments({ role: 'admin', sdis_id: 'sdis-a' }, 'sdis-a')).toBe(true);
  });

  it("pas l'admin d'un autre SDIS, ni un validateur, ni un agent", () => {
    expect(canModerateComments({ role: 'admin', sdis_id: 'sdis-b' }, 'sdis-a')).toBe(false);
    expect(canModerateComments({ role: 'validator', sdis_id: 'sdis-a' }, 'sdis-a')).toBe(false);
    expect(canModerateComments({ role: 'user', sdis_id: 'sdis-a' }, 'sdis-a')).toBe(false);
  });

  it('le super-administrateur peut modérer partout', () => {
    expect(canModerateComments({ role: 'super_admin', sdis_id: null }, 'sdis-a')).toBe(true);
  });

  it('personne sans profil', () => {
    expect(canModerateComments(null, 'sdis-a')).toBe(false);
    expect(canModerateComments({ role: 'admin', sdis_id: 'sdis-a' }, null)).toBe(false);
  });
});
