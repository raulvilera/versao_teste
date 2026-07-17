# Plataforma de Fichas Cadastrais — Multi-Empresa

Cada empresa cliente tem sua própria ficha personalizável (logo, cores,
campos), com painel admin, assinatura paga via Mercado Pago, PDF automático
enviado por WhatsApp e/ou e-mail, e lista de fichas recebidas exportável
em Excel.

## Arquitetura (um único front-end)

Tudo roda a partir de UM arquivo: `index.html` — HTML + CSS + JS puro,
sem build, sem framework, usando o Supabase direto via CDN. Não existe
mais um app React separado; se você tiver clonado uma versão antiga
deste repo com pasta `src/`, pode apagar — ela não é usada pra nada.

A única parte que roda em servidor é a pasta `api/` (funções serverless
da Vercel), porque só ali é seguro guardar credenciais secretas
(service role do Supabase, token do Mercado Pago, da Z-API, do Resend).

```
Colaborador preenche a ficha pública (index.html#/f/{slug})
        │
        ├──► (opcional) Google Sheets da empresa, se ela configurou
        │     um Apps Script — é só um espelho, não é mais obrigatório
        │
        └──► /api/send-ficha (Vercel, OBRIGATÓRIO)
                  │
                  ├──► grava a ficha na tabela `submissions` (Supabase) — fonte de verdade
                  ├──► gera o PDF (pdf-lib)
                  ├──► salva o PDF no Storage privado (bucket fichas-pdf)
                  ├──► incrementa o contador de uso da empresa
                  ├──► envia o PDF pro WhatsApp da empresa (Z-API), se configurado
                  └──► envia o PDF por e-mail (Resend), se configurado

Empresa assina o plano Pro no painel (index.html#/dashboard)
        │
        ▼
  /api/create-subscription ──► Mercado Pago (checkout de assinatura recorrente)
        │
        ▼
  /api/mercadopago-webhook ──► Mercado Pago avisa quando o pagamento é
                                 aprovado; a função libera o plano "pro"
                                 automaticamente (sem intervenção manual)
```

## Rodando do zero

### 1. Banco de dados (Supabase)
No SQL Editor, rode NESTA ORDEM (cada arquivo inteiro, de uma vez):
1. `sql/001_schema_inicial.sql`
2. `sql/002_signup_e_storage.sql`
3. `sql/003_whatsapp_e_pdf.sql`
4. `sql/004_submissions_direto_supabase.sql`
5. `sql/005_assinatura_mercadopago.sql`
6. `sql/006_correcoes.sql`

Em Authentication > Settings, desative "Confirm email" (o fluxo de
cadastro de empresa depende de sessão ativa logo após o signup).

### 2. No `index.html`
Confirme que as duas linhas do topo do `<script>` têm a URL e a chave
publishable/anon do SEU projeto Supabase (Project Settings > API).

### 3. WhatsApp (Z-API) — opcional mas recomendado
Crie conta em z-api.io, conecte um número, pegue Instance ID e Token.

### 4. Mercado Pago — necessário pra cobrança funcionar
Em Suas integrações > Credenciais, pegue o Access Token (produção ou
teste). Configure o webhook em Suas integrações > Webhooks apontando
para `https://SEUSITE.com/api/mercadopago-webhook`, evento "Assinaturas".

### 5. Resend (e-mail) — opcional
Crie conta em resend.com, pegue a API key. Sem isso, o envio por
e-mail é simplesmente pulado — não quebra nada.

### 6. Variáveis de ambiente no Vercel
Cadastre as 6 variáveis do `.env.example` em Settings > Environment
Variables (produção + preview).

### 7. Deploy
Suba o repositório pro GitHub e importe no Vercel. A pasta `api/` vira
funções serverless automaticamente — não precisa de build step, é um
site estático + funções.

## Uso

- Empresa se cadastra em `#/cadastro`, loga em `#/login`
- No painel (`#/dashboard`): configura logo/cores, campos da ficha,
  WhatsApp/e-mail de notificação, assina o plano Pro, vê as fichas
  recebidas e exporta em Excel
- Compartilha o link `#/f/{slug}` com os colaboradores

## Estrutura de arquivos

```
├── index.html              # a plataforma inteira (login, painel, ficha pública)
├── package.json             # dependências só das funções serverless
├── vercel.json               # rewrite de rotas (irrelevante pro hash-routing,
│                              # mantido como rede de segurança)
├── .env.example
├── api/
│   ├── send-ficha.ts         # grava submissão + gera PDF + WhatsApp + e-mail
│   ├── create-subscription.ts # cria assinatura no Mercado Pago
│   └── mercadopago-webhook.ts # recebe confirmação e libera o plano
├── sql/
│   ├── 001_schema_inicial.sql
│   ├── 002_signup_e_storage.sql
│   ├── 003_whatsapp_e_pdf.sql
│   ├── 004_submissions_direto_supabase.sql
│   ├── 005_assinatura_mercadopago.sql
│   └── 006_correcoes.sql
└── public/                   # ícones/manifest PWA prontos, mas NÃO
                                # conectados ao index.html ainda (não tem
                                # <link rel="manifest"> nem service worker
                                # registrado) — deixe de lado por enquanto
```

## O que ainda NÃO está automatizado

- **Gerador automático do Apps Script**: se a empresa quiser espelhar
  no Google Sheets dela, ainda precisa criar e colar a URL manualmente
  (mas isso agora é 100% opcional, o sistema funciona sem isso).
- **PWA**: os ícones e o manifest existem em `public/`, mas não estão
  ligados ao `index.html`. Se quiser "instalar" a plataforma como app,
  isso é um próximo passo separado.
