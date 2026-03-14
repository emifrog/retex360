'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { Cookie, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COOKIE_CONSENT_KEY = 'retex360-cookie-consent';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot(): string | null {
  return localStorage.getItem(COOKIE_CONSENT_KEY);
}

function getServerSnapshot(): string | null {
  return 'loading'; // Server: don't show banner
}

export function CookieConsent() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const handleAccept = useCallback(() => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    window.dispatchEvent(new StorageEvent('storage'));
  }, []);

  const handleReject = useCallback(() => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    window.dispatchEvent(new StorageEvent('storage'));
  }, []);

  // Don't render on server ('loading') or if already answered
  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
    >
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-xl shadow-2xl p-4 md:p-6">
        <div className="flex items-start gap-4">
          <Cookie className="w-6 h-6 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 space-y-3">
            <h2 className="font-semibold text-sm">Gestion des cookies</h2>
            <p className="text-sm text-muted-foreground">
              RETEX360 utilise des cookies essentiels au fonctionnement du site (authentification, préférences).
              Nous utilisons également Sentry pour le suivi des erreurs afin d&apos;améliorer la qualité du service.
              {' '}
              <a
                href="https://retex360-platform.netlify.app/pages/confidentialite"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                En savoir plus
              </a>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleAccept}>
                Accepter tout
              </Button>
              <Button size="sm" variant="outline" onClick={handleReject}>
                Cookies essentiels uniquement
              </Button>
            </div>
          </div>
          <button
            onClick={handleReject}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fermer le bandeau cookies"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
