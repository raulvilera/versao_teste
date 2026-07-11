import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Cliente com a service role key — só existe no servidor, nunca é exposto ao navegador.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PrintableRow {
  label: string;
  value: string;
}

interface PrintableSection {
  title: string;
  rows: PrintableRow[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ status: 'error', mensagem: 'Método não permitido.' });
    return;
  }

  try {
    const { companyId, formTitle, rawData, sections } = req.body as {
      companyId: string;
      formTitle: string;
      rawData: Record<string, string>;
      sections: PrintableSection[];
    };

    if (!companyId || !sections || !rawData) {
      res.status(400).json({ status: 'error', mensagem: 'Dados incompletos para enviar a ficha.' });
      return;
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      res.status(404).json({ status: 'error', mensagem: 'Empresa não encontrada.' });
      return;
    }

    // ---------- 0. Valida o limite do plano (checagem de verdade, no servidor) ----------
    if (company.plan === 'trial' && company.submissions_count >= company.trial_limit) {
      res.status(403).json({ status: 'error', mensagem: 'Esta empresa atingiu o limite de fichas do plano de teste.' });
      return;
    }

    // ---------- 1. Gera o PDF ----------
    const pdfBytes = await gerarPdf(formTitle || 'Ficha Cadastral', sections, company.name);

    // ---------- 2. Salva o PDF no Storage (bucket privado) ----------
    const fileName = `${companyId}/ficha-${Date.now()}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('fichas-pdf')
      .upload(fileName, pdfBytes, { contentType: 'application/pdf' });

    if (uploadError) throw uploadError;

    // ---------- 3. Grava a submissão (os dados de verdade) direto no banco ----------
    const { error: insertError } = await supabaseAdmin
      .from('submissions')
      .insert({ company_id: companyId, data: rawData, pdf_path: fileName });

    if (insertError) throw insertError;

    // ---------- 4. Incrementa o contador de uso da empresa ----------
    await supabaseAdmin.rpc('increment_company_usage', { p_company_id: companyId });

    // Link assinado válido por 7 dias — só quem tem o link consegue abrir.
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from('fichas-pdf')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7);

    if (signError || !signed) throw signError ?? new Error('Erro ao gerar link do PDF.');

    // ---------- 5. Envia pro WhatsApp da empresa, se configurado (Z-API) ----------
    let whatsappStatus: 'enviado' | 'falhou' | 'nao_configurado' = 'nao_configurado';

    if (company.whatsapp_number && process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN) {
      const zapiUrl = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-document/pdf`;
      const zapiResp = await fetch(zapiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: company.whatsapp_number,
          document: signed.signedUrl,
          fileName: `Ficha Cadastral - ${company.name}.pdf`,
        }),
      });
      whatsappStatus = zapiResp.ok ? 'enviado' : 'falhou';
    }

    // ---------- 6. Envia por e-mail pra empresa, se configurado (Resend) ----------
    let emailStatus: 'enviado' | 'falhou' | 'nao_configurado' = 'nao_configurado';

    if (company.notification_email && process.env.RESEND_API_KEY) {
      try {
        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
        const emailResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'Fichas <onboarding@resend.dev>',
            to: [company.notification_email],
            subject: `Nova ficha recebida — ${formTitle || 'Ficha Cadastral'}`,
            html: `<p>Uma nova ficha foi enviada para <strong>${company.name}</strong>.</p>
                   <p>O PDF está em anexo. Ele também fica disponível por 7 dias neste link:</p>
                   <p><a href="${signed.signedUrl}">${signed.signedUrl}</a></p>`,
            attachments: [
              {
                filename: `Ficha Cadastral - ${company.name}.pdf`,
                content: pdfBase64,
              },
            ],
          }),
        });

        if (!emailResp.ok) {
          console.error('Erro Resend:', await emailResp.text());
        }
        emailStatus = emailResp.ok ? 'enviado' : 'falhou';
      } catch (emailErr) {
        console.error('Erro ao enviar e-mail:', emailErr);
        emailStatus = 'falhou';
      }
    }

    res.status(200).json({ status: 'ok', pdfUrl: signed.signedUrl, whatsappStatus, emailStatus });
  } catch (err: any) {
    console.error('Erro em /api/send-ficha:', err);
    res.status(500).json({ status: 'error', mensagem: err.message ?? 'Erro interno ao gravar/gerar a ficha.' });
  }
}

async function gerarPdf(title: string, sections: PrintableSection[], companyName: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 50;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function novaPaginaSeNecessario(espacoNecessario: number) {
    if (y - espacoNecessario < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  page.drawText(companyName, { x: margin, y, size: 11, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 20;
  page.drawText(title, { x: margin, y, size: 18, font: fontBold, color: rgb(0.1, 0.16, 0.5) });
  y -= 12;
  page.drawText(new Date().toLocaleDateString('pt-BR'), { x: margin, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
  y -= 26;

  for (const section of sections) {
    novaPaginaSeNecessario(46);
    page.drawText(section.title, { x: margin, y, size: 13, font: fontBold, color: rgb(0.1, 0.16, 0.5) });
    y -= 10;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 18;

    // Controla o "grupo" atual (ex: "Experiências Profissionais 1") pra não
    // repetir o prefixo inteiro em cada linha — isso é o que causava o rótulo
    // ficar mais largo que o espaço reservado e sobrepor o valor ao lado.
    let grupoAtual: string | null = null;

    for (const row of section.rows) {
      novaPaginaSeNecessario(18);

      // Rótulos de campos repetíveis vêm no formato "Grupo N — Campo".
      const separadorIndex = row.label.indexOf(' — ');
      const temGrupo = separadorIndex !== -1;
      const grupoLabel = temGrupo ? row.label.slice(0, separadorIndex) : null;
      const campoLabel = temGrupo ? row.label.slice(separadorIndex + 3) : row.label;

      if (temGrupo && grupoLabel !== grupoAtual) {
        novaPaginaSeNecessario(20);
        y -= 4;
        page.drawText(grupoLabel!, { x: margin, y, size: 10.5, font: fontBold, color: rgb(0.1, 0.16, 0.5) });
        y -= 16;
        grupoAtual = grupoLabel;
      } else if (!temGrupo) {
        grupoAtual = null;
      }

      const indent = temGrupo ? 16 : 0;
      const labelX = margin + indent;
      const valueX = temGrupo ? labelX + 140 : margin + 170;

      page.drawText(`${campoLabel}:`, { x: labelX, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      const valorExibido = (row.value || '-').slice(0, 80);
      page.drawText(valorExibido, { x: valueX, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
      y -= 16;
    }
    y -= 14;
  }

  return pdfDoc.save();
}
