'use client';

import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COOKIE_CONSENT_KEY = 'retex360-cookie-consent';

type ConsentValue = 'accepted' | 'rejected' | null;

export function CookieConsent() {
  const [consent, setConsent] = useState<ConsentValue>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentValue;
    setConsent(stored);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setConsent('accepted');
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    setConsent('rejected');
  };

  // Don't render until mounted (avoid hydration mismatch) or if already answered
  if (!mounted || consent !== null) return null;

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
