/**
 * @jest-environment node
 *
 * `scrubEvent` décide de ce qui quitte l'infrastructure vers le collecteur
 * d'erreurs. Un oubli n'y produit aucun symptôme visible : la donnée part, et
 * personne ne s'en aperçoit. D'où des tests qui nomment explicitement ce qui
 * ne doit jamais sortir.
 */
import type { ErrorEvent } from '@sentry/nextjs';
import { scrubEvent } from '@/lib/sentry-scrub';

function eventWith(request: Record<string, unknown>): ErrorEvent {
  return { request } as unknown as ErrorEvent;
}

describe('scrubEvent — ce qui ne doit pas sortir', () => {
  it('retire le corps de requête, qui porte le REX rédigé', () => {
    const event = eventWith({
      data: { title: 'Feu de hangar', description: 'Victime au 12 rue des Lilas' },
    });
    expect(scrubEvent(event).request?.data).toBe('[retiré]');
  });

  it('retire les paramètres d’URL, qui portent les termes de recherche', () => {
    const event = eventWith({ query_string: 'q=nom+de+victime' });
    expect(scrubEvent(event).request?.query_string).toBe('[retiré]');
  });

  it('retire les cookies, qui portent le jeton de session', () => {
    // Un rapport d'erreur ne doit pas permettre de rejouer la session de
    // l'utilisateur qui l'a déclenché.
    const event = eventWith({ cookies: { 'sb-access-token': 'ey...' } });
    expect(scrubEvent(event).request?.cookies).toBeUndefined();
  });

  it('écarte les en-têtes hors liste blanche', () => {
    const event = eventWith({
      headers: {
        cookie: 'sb-access-token=ey...',
        authorization: 'Bearer ey...',
        'x-forwarded-for': '192.168.1.1',
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0',
      },
    });
    const headers = scrubEvent(event).request?.headers ?? {};
    expect(headers).toEqual({ 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0' });
  });

  it('traite les en-têtes sans tenir compte de la casse', () => {
    const event = eventWith({ headers: { Cookie: 'x', 'Content-Type': 'application/json' } });
    const headers = scrubEvent(event).request?.headers ?? {};
    expect(headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('ne garde de l’utilisateur que son identifiant technique', () => {
    const event = {
      user: { id: 'u-1', email: 'pompier@sdis06.fr', ip_address: '192.168.1.1' },
    } as unknown as ErrorEvent;
    expect(scrubEvent(event).user).toEqual({ id: 'u-1' });
  });

  it('vide l’utilisateur quand il n’a pas d’identifiant', () => {
    const event = { user: { email: 'pompier@sdis06.fr' } } as unknown as ErrorEvent;
    expect(scrubEvent(event).user).toEqual({});
  });
});

describe('scrubEvent — ce qui doit rester exploitable', () => {
  it('conserve le chemin et la méthode', () => {
    // Le chemin ne contient que des UUID : il situe l'erreur sans rien révéler.
    const event = eventWith({
      url: 'https://retex360.fr/api/rex/3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      method: 'POST',
      data: { secret: true },
    });
    const scrubbed = scrubEvent(event);
    expect(scrubbed.request?.url).toBe(
      'https://retex360.fr/api/rex/3f2504e0-4f89-11d3-9a0c-0305e82c3301'
    );
    expect(scrubbed.request?.method).toBe('POST');
  });

  it('laisse intacts les événements sans requête ni utilisateur', () => {
    const event = { message: 'boom' } as unknown as ErrorEvent;
    expect(scrubEvent(event)).toEqual({ message: 'boom' });
  });

  it('ne crée pas de champs absents', () => {
    // Un événement sans corps ni en-têtes ne doit pas repartir avec des clés
    // « [retiré] » qui laisseraient croire qu'il en avait.
    const event = eventWith({ url: 'https://retex360.fr/rex' });
    expect(scrubEvent(event).request).toEqual({ url: 'https://retex360.fr/rex' });
  });

  it('renvoie bien l’événement (un retour nul le supprimerait)', () => {
    const event = eventWith({ data: 'x' });
    expect(scrubEvent(event)).toBe(event);
  });
});
