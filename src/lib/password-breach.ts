/**
 * Vérifie si un mot de passe figure dans une fuite de données connue via l'API
 * « Pwned Passwords » de HaveIBeenPwned, en k-anonymity : seuls les 5 premiers
 * caractères du hash SHA-1 sont envoyés au service — jamais le mot de passe ni
 * son hash complet.
 *
 * Fail-open : en cas d'erreur réseau, de timeout ou de réponse non-OK, renvoie
 * `false` (on ne bloque pas une opération légitime si HIBP est indisponible).
 *
 * Serveur uniquement (utilise crypto.subtle + fetch). À appeler dans les routes
 * qui définissent un nouveau mot de passe, après la validation Zod.
 */
const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';
const TIMEOUT_MS = 2500;

async function sha1HexUpper(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export async function isPasswordCompromised(password: string): Promise<boolean> {
  try {
    const hash = await sha1HexUpper(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let body: string;
    try {
      const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
        // "Add-Padding" renvoie des entrées factices (count 0) pour masquer le
        // nombre réel de résultats — on les ignore via le filtre count > 0.
        headers: { 'Add-Padding': 'true' },
        signal: controller.signal,
      });
      if (!res.ok) return false; // fail-open
      body = await res.text();
    } finally {
      clearTimeout(timer);
    }

    for (const line of body.split('\n')) {
      const [hashSuffix, countStr] = line.trim().split(':');
      if (hashSuffix === suffix && Number(countStr) > 0) return true;
    }
    return false;
  } catch {
    return false; // fail-open (réseau / timeout / abort)
  }
}
