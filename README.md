# Plataforma de Fichas Cadastrais — Multi-Empresa

Cada empresa cliente tem sua própria ficha personalizável (logo, cores,
campos), com painel admin, dados salvos na planilha da própria empresa, e
agora: PDF automático da ficha enviado pro WhatsApp da empresa.

## Como os dados fluem

```
Colaborador preenche a ficha pública (/f/{slug})
        │
        ├──► Google Sheets da EMPRESA (via Apps Script dela) — dados pessoais
        ├──► submissions_log (Supabase) — só contagem, sem dados pessoais
        └──► /api/send-ficha (Vercel) 
                  │
                  ├──► gera PDF (pdf-lib)
                  ├──► salva no Storage privado do Supabase (bucket fichas-pdf)
                  └──► envia o link do PDF pro WhatsApp da empresa (Z-API)
```

## Rodando do zero

### 1. Banco de dados (Supabase)
No SQL Editor, rode NESTA ORDEM:
1. `sql/001_schema_inicial.sql`
2. `sql/002_signup_e_storage.sql`
3. `sql/003_whatsapp_e_pdf.sql`

Em Authentication > Settings, desative "Confirm email" (o fluxo de signup
depende de sessão ativa logo após o cadastro).

### 2. WhatsApp (Z-API)
1. Crie conta em https://www.z-api.io e conecte um número de WhatsApp
   (pode ser o número da sua própria operação, que vai disparar os PDFs
   para o WhatsApp de cada empresa cliente).
2. Copie o **Instance ID** e o **Token**.

### 3. Variáveis de ambiente
Copie `.env.example` para `.env.local`, preencha tudo. No Vercel, cadastre
as mesmas 6 variáveis em Settings > Environment Variables.

### 4. Deploy
Suba o repositório no GitHub (como você já faz) e importe no Vercel. A pasta
`api/` é detectada automaticamente como funções serverless.

### 5. Uso
- Empresa se cadastra em `/cadastro`
- Loga em `/login`, vai pro `/dashboard`
- Configura logo, cores, URL do Apps Script dela e o WhatsApp
- Compartilha o link `/f/{slug}` com os colaboradores

## O que falta pra "completo"

- [ ] **Cobrança real**: hoje o `PaymentGate` só mostra um aviso. Falta
      integrar Mercado Pago (mesmo padrão do seu MatematicaApp) pra
      desbloquear automaticamente quando o pagamento é aprovado.
- [ ] **Gerador automático do Apps Script**: hoje a empresa precisa colar
      manualmente a URL de um Apps Script que ELA já publicou. Dá pra
      automatizar isso gerando o código `.gs` pronto pra copiar.
- [ ] **Histórico de fichas no painel**: listar os PDFs já gerados (o
      bucket `fichas-pdf` já guarda tudo, só falta a tela).
- [ ] **Reenvio manual de WhatsApp**: caso o envio automático falhe, um
      botão no painel pra reenviar o último PDF.

## Estrutura de arquivos

```
plataforma-fichas/
├── api/
│   └── send-ficha.ts          # gera PDF + envia WhatsApp (serverless)
├── sql/
│   ├── 001_schema_inicial.sql
│   ├── 002_signup_e_storage.sql
│   └── 003_whatsapp_e_pdf.sql
├── src/
│   ├── components/
│   │   ├── BrandingEditor.tsx  # logo, cores, Apps Script URL, WhatsApp
│   │   ├── FormBuilder.tsx     # liga/desliga campos e seções
│   │   ├── FichaRenderer.tsx   # monta a ficha dinâmica + submit
│   │   └── PaymentGate.tsx
│   ├── contexts/AuthContext.tsx
│   ├── data/defaultSections.ts # config padrão pra empresa nova
│   ├── lib/supabaseClient.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   ├── Dashboard.tsx
│   │   └── FichaPublica.tsx    # rota pública /f/:slug
│   ├── types/formConfig.ts
│   ├── utils/masks.ts          # CPF, telefone, CEP, slugify
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── vite.config.ts
├── tsconfig.json
├── vercel.json
└── .env.example
```
