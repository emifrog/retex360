import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { RexPdfTemplate } from '@/lib/pdf/rex-template';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const anonymize = searchParams.get('anonymize') === 'true';
    
    const supabase = await createClient();

    // Fetch REX with author and SDIS
    const { data: rex, error } = await supabase
      .from('rex')
      .select(`
        *,
        author:author_id(id, full_name, grade, email),
        sdis:sdis_id(id, code, name)
      `)
      .eq('id', id)
      .single();

    if (error || !rex) {
      return NextResponse.json(
        { error: 'REX not found' },
        { status: 404 }
      );
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      RexPdfTemplate({ 
        rex: rex as Parameters<typeof RexPdfTemplate>[0]['rex'],
        anonymize,
      })
    );

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer);

    // Return PDF
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rex-${rex.slug || id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
