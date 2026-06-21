import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { RexPdfTemplate } from '@/lib/pdf/rex-template';
import { createClient } from '@/lib/supabase/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { signAttachmentUrls } from '@/lib/storage';

// PDF-specific rate limiter: 5 PDFs per hour per IP (expensive operation)
const pdfRateLimiter = rateLimiters.ai; // Reuses AI limiter: 10/min — heavy ops

// Safety limits to prevent OOM / timeout
const MAX_CHRONOLOGIE_ITEMS = 200;
const MAX_PRESCRIPTIONS = 200;
const MAX_TEXT_LENGTH = 100_000; // 100k chars per field
const MAX_TOTAL_SIZE = 5_000_000; // 5MB estimated JSON size

function truncateText(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  if (text.length <= max) return text;
  return text.slice(0, max) + '… [tronqué]';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PDF-specific rate limit (stricter than general API)
  const ip = getClientIp(request);
  const rl = await pdfRateLimiter.limit(`pdf:${ip}`);
  if (!rl.success) return rateLimitResponse(rl.reset);

  const log = logger.withCorrelation();

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const anonymize = searchParams.get('anonymize') === 'true';

    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Fetch REX + attachments in parallel
    const [rexResult, attachmentsResult] = await Promise.all([
      supabase
        .from('rex')
        .select(`
          id, title, slug, description, context, means_deployed, difficulties,
          lessons_learned, type, severity, intervention_date, tags,
          type_production, focus_thematiques, key_figures, chronologie,
          prescriptions, message_ambiance, sitac, elements_favorables,
          elements_defavorables, documentation_operationnelle, updated_at,
          author:author_id(id, full_name, grade),
          sdis:sdis_id(id, code, name)
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('rex_attachments')
        .select('id, file_name, file_type, storage_path')
        .eq('rex_id', id),
    ]);

    const { data: rex, error } = rexResult;

    if (error || !rex) {
      return NextResponse.json({ error: 'REX non trouvé' }, { status: 404 });
    }

    // Build signed URLs for image attachments (max 10 images in PDF). The
    // bucket is private; URLs are short-lived since @react-pdf fetches them
    // server-side immediately during rendering. Access is already gated by the
    // REX fetch above (RLS-bound client).
    const imageAtts = (attachmentsResult.data || [])
      .filter((att) => att.file_type?.startsWith('image/'))
      .slice(0, 10);
    const signedImageUrls = await signAttachmentUrls(
      imageAtts.map((att) => att.storage_path),
      600
    );
    const imageAttachments = imageAtts
      .map((att) => ({ name: att.file_name, url: signedImageUrls.get(att.storage_path) }))
      .filter((att): att is { name: string; url: string } => Boolean(att.url));

    // ETag based on REX updated_at — avoid regenerating identical PDFs
    const etag = `"pdf-${id}-${rex.updated_at || ''}-${anonymize}"`;
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new Response(null, { status: 304 });
    }

    // Check total size to prevent OOM
    const estimatedSize = JSON.stringify(rex).length;
    if (estimatedSize > MAX_TOTAL_SIZE) {
      log.warn('REX too large for PDF', { rexId: id, size: estimatedSize });
      return NextResponse.json(
        { error: 'REX trop volumineux pour l\'export PDF (> 5 Mo de données)' },
        { status: 413 }
      );
    }

    // Truncate long text fields
    rex.description = truncateText(rex.description, MAX_TEXT_LENGTH);
    rex.context = truncateText(rex.context, MAX_TEXT_LENGTH);
    rex.means_deployed = truncateText(rex.means_deployed, MAX_TEXT_LENGTH);
    rex.difficulties = truncateText(rex.difficulties, MAX_TEXT_LENGTH);
    rex.lessons_learned = truncateText(rex.lessons_learned, MAX_TEXT_LENGTH);
    rex.message_ambiance = truncateText(rex.message_ambiance, MAX_TEXT_LENGTH);
    rex.sitac = truncateText(rex.sitac, MAX_TEXT_LENGTH);
    rex.elements_favorables = truncateText(rex.elements_favorables, MAX_TEXT_LENGTH);
    rex.elements_defavorables = truncateText(rex.elements_defavorables, MAX_TEXT_LENGTH);
    rex.documentation_operationnelle = truncateText(rex.documentation_operationnelle, MAX_TEXT_LENGTH);

    // Truncate arrays
    if (Array.isArray(rex.chronologie) && rex.chronologie.length > MAX_CHRONOLOGIE_ITEMS) {
      rex.chronologie = rex.chronologie.slice(0, MAX_CHRONOLOGIE_ITEMS);
    }
    if (Array.isArray(rex.prescriptions) && rex.prescriptions.length > MAX_PRESCRIPTIONS) {
      rex.prescriptions = rex.prescriptions.slice(0, MAX_PRESCRIPTIONS);
    }

    // Server-side anonymization (don't trust client param alone)
    if (anonymize && rex.author && !Array.isArray(rex.author)) {
      (rex.author as { full_name: string; grade: string }).full_name =
        (rex.author as { grade?: string }).grade || 'Agent';
    }

    // Generate PDF with timing
    const startTime = performance.now();

    const pdfBuffer = await renderToBuffer(
      RexPdfTemplate({
        rex: rex as unknown as Parameters<typeof RexPdfTemplate>[0]['rex'],
        anonymize,
        images: imageAttachments,
      })
    );

    const duration = Math.round(performance.now() - startTime);

    log.info('PDF generated', {
      rexId: id,
      duration: `${duration}ms`,
      size: `${(pdfBuffer.length / 1024).toFixed(0)}KB`,
    });

    if (duration > 25_000) {
      log.warn('PDF generation slow', { rexId: id, duration });
    }

    if (pdfBuffer.length > 10_000_000) {
      log.warn('PDF too large', { rexId: id, size: pdfBuffer.length });
    }

    // Return PDF — convert Node Buffer to Uint8Array view (zero-copy) for Response compatibility
    return new Response(new Uint8Array(pdfBuffer) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rex-${rex.slug || id}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, max-age=300',
        'ETag': etag,
      },
    });
  } catch (error) {
    log.error('PDF generation error', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    );
  }
}
