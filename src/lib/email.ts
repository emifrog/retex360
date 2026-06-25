import type { Transporter } from 'nodemailer';
import { logger } from '@/lib/logger';

/**
 * Envoi d'emails transactionnels via SMTP (nodemailer), configuré par variables
 * d'environnement. Neutre vis-à-vis du fournisseur : pointez SMTP_* sur le relais
 * de votre choix (relais SDIS, fournisseur UE, Scaleway TEM…).
 *
 * Le SDK nodemailer est importé de façon PARESSEUSE : tant que SMTP n'est pas
 * configuré, il n'est jamais chargé. Échoue en douceur (log + `false`) pour ne
 * jamais bloquer l'action métier (l'invitation reste créée, le lien copiable).
 */
const SMTP = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  user: process.env.SMTP_USER,
  password: process.env.SMTP_PASSWORD,
  from: process.env.SMTP_FROM,
  secure: process.env.SMTP_SECURE === 'true', // true pour le port 465
};

export function isEmailConfigured(): boolean {
  return Boolean(SMTP.host && SMTP.user && SMTP.password && SMTP.from);
}

let transporterPromise: Promise<Transporter> | null = null;
function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const nodemailer = await import('nodemailer');
      return nodemailer.createTransport({
        host: SMTP.host,
        port: SMTP.port,
        secure: SMTP.secure,
        auth: { user: SMTP.user, pass: SMTP.password },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
    })();
  }
  return transporterPromise;
}

/** Envoie un email. Renvoie true si envoyé, false sinon (non configuré / erreur). */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    const transporter = await getTransporter();
    await transporter.sendMail({
      from: SMTP.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    logger.error('Email send error:', error);
    return false;
  }
}

const ROLE_LABELS_FR: Record<string, string> = {
  user: 'Utilisateur',
  validator: 'Validateur',
  admin: 'Administrateur',
  super_admin: 'Super administrateur',
};

/** Envoie l'email d'invitation contenant le lien à usage unique. */
export async function sendInvitationEmail(params: {
  to: string;
  inviteUrl: string;
  sdisName: string | null;
  role: string;
  expiresInDays: number;
}): Promise<boolean> {
  const roleLabel = ROLE_LABELS_FR[params.role] ?? params.role;
  const sdisLine = params.sdisName ? ` au sein du ${params.sdisName}` : '';
  const subject = 'Invitation à rejoindre RETEX360';

  const text = `Bonjour,

Vous êtes invité(e) à créer votre compte sur RETEX360${sdisLine} en tant que ${roleLabel}.

Pour finaliser votre inscription, ouvrez ce lien (valable ${params.expiresInDays} jours, à usage unique) :
${params.inviteUrl}

Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.

— RETEX360`;

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
  <h2 style="color:#b91c1c;margin:0 0 16px">RETEX360 🚒</h2>
  <p>Bonjour,</p>
  <p>Vous êtes invité(e) à créer votre compte sur <strong>RETEX360</strong>${sdisLine} en tant que <strong>${roleLabel}</strong>.</p>
  <p style="margin:24px 0">
    <a href="${params.inviteUrl}" style="background:#b91c1c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;font-weight:600">Finaliser mon inscription</a>
  </p>
  <p style="font-size:13px;color:#6b7280">Ce lien est valable <strong>${params.expiresInDays} jours</strong> et à usage unique. S'il ne fonctionne pas, copiez l'adresse suivante dans votre navigateur :</p>
  <p style="font-size:12px;word-break:break-all;color:#6b7280">${params.inviteUrl}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
  <p style="font-size:12px;color:#9ca3af">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
</div>`;

  return sendEmail({ to: params.to, subject, html, text });
}

/** Envoie un lien de réinitialisation de mot de passe (généré côté serveur). */
export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}): Promise<boolean> {
  const subject = 'Réinitialisation de votre mot de passe RETEX360';

  const text = `Bonjour,

Une réinitialisation de votre mot de passe RETEX360 a été demandée par votre administrateur.

Pour définir un nouveau mot de passe, ouvrez ce lien :
${params.resetUrl}

Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.

— RETEX360`;

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
  <h2 style="color:#b91c1c;margin:0 0 16px">RETEX360 🚒</h2>
  <p>Bonjour,</p>
  <p>Une réinitialisation de votre mot de passe <strong>RETEX360</strong> a été demandée par votre administrateur.</p>
  <p style="margin:24px 0">
    <a href="${params.resetUrl}" style="background:#b91c1c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;font-weight:600">Définir un nouveau mot de passe</a>
  </p>
  <p style="font-size:13px;color:#6b7280">Si le bouton ne fonctionne pas, copiez l'adresse suivante dans votre navigateur :</p>
  <p style="font-size:12px;word-break:break-all;color:#6b7280">${params.resetUrl}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
  <p style="font-size:12px;color:#9ca3af">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
</div>`;

  return sendEmail({ to: params.to, subject, html, text });
}
