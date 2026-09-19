import type { VercelRequest, VercelResponse } from '@vercel/node';

// Endpoint de diagnóstico do Assistente Virtual / Z-API.
// Permite testar o envio de texto e verificar status e respostas da Z-API.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const phone = (req.query.phone as string) || (req.body?.phone as string);

  if (!phone) {
    res.status(400).json({ status: 'error', mensagem: 'Passe o número em ?phone=5511999999999' });
    return;
  }

  if (!process.env.ZAPI_INSTANCE_ID || !process.env.ZAPI_TOKEN) {
    res.status(500).json({
      status: 'error',
      mensagem: 'ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados nas variáveis de ambiente da Vercel.',
    });
    return;
  }

  try {
    const zapiHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(process.env.ZAPI_CLIENT_TOKEN ? { 'Client-Token': process.env.ZAPI_CLIENT_TOKEN } : {}),
    };

    const zapiUrl = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`;
    const zapiResp = await fetch(zapiUrl, {
      method: 'POST',
      headers: zapiHeaders,
      body: JSON.stringify({
        phone,
        message: '🤖 *Assistente Virtual*\n\nTeste de conexão do WhatsApp realizado com sucesso! Sua instância da Z-API está ativa e configurada para o envio das fichas cadastrais em PDF.',
      }),
    });

    const bodyText = await zapiResp.text();
    let bodyParsed: any = bodyText;
    try {
      bodyParsed = JSON.parse(bodyText);
    } catch {
      // mantém como texto puro
    }

    res.status(200).json({
      status: zapiResp.ok ? 'ok' : 'error',
      httpStatusDaZapi: zapiResp.status,
      httpOkDaZapi: zapiResp.ok,
      corpoDaResposta: bodyParsed,
      usouClientToken: Boolean(process.env.ZAPI_CLIENT_TOKEN),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', mensagem: err.message ?? 'Erro ao chamar a Z-API.' });
  }
}
