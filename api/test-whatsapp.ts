import type { VercelRequest, VercelResponse } from '@vercel/node';

// ENDPOINT TEMPORÁRIO DE DIAGNÓSTICO — manda um texto simples pelo WhatsApp
// via Z-API e devolve a resposta CRUA da Z-API (corpo completo, não só o
// status). Serve só pra descobrir por que o envio de PDF não está
// chegando. Pode apagar esse arquivo depois de resolver o problema.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const phone = (req.query.phone as string) || (req.body?.phone as string);

  if (!phone) {
    res.status(400).json({ status: 'error', mensagem: 'Passe o número em ?phone=5511999999999' });
    return;
  }

  if (!process.env.ZAPI_INSTANCE_ID || !process.env.ZAPI_TOKEN) {
    res.status(500).json({ status: 'error', mensagem: 'ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados.' });
    return;
  }

  try {
    const zapiUrl = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`;
    const zapiResp = await fetch(zapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.ZAPI_CLIENT_TOKEN ? { 'Client-Token': process.env.ZAPI_CLIENT_TOKEN } : {}),
      },
      body: JSON.stringify({
        phone,
        message: 'Teste de diagnóstico da Plataforma de Fichas — se você recebeu isso, o envio de texto está funcionando.',
      }),
    });

    const bodyText = await zapiResp.text();
    let bodyParsed: any = bodyText;
    try {
      bodyParsed = JSON.parse(bodyText);
    } catch {
      // corpo não era JSON, mantém como texto mesmo
    }

    res.status(200).json({
      status: 'ok',
      httpStatusDaZapi: zapiResp.status,
      httpOkDaZapi: zapiResp.ok,
      corpoDaResposta: bodyParsed,
      usouClientToken: Boolean(process.env.ZAPI_CLIENT_TOKEN),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', mensagem: err.message ?? 'Erro ao chamar a Z-API.' });
  }
}
