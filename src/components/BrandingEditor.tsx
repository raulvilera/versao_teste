import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { normalizeWhatsapp } from '../utils/masks';
import type { Company } from '../types/formConfig';

interface Props {
  company: Company;
  onSaved: () => void;
}

export default function BrandingEditor({ company, onSaved }: Props) {
  const [name, setName] = useState(company.name);
  const [primaryColor, setPrimaryColor] = useState(company.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(company.secondary_color);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState(company.whatsapp_number ?? '');
  const [notificationEmail, setNotificationEmail] = useState(company.notification_email ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [testingWhatsapp, setTestingWhatsapp] = useState(false);
  const [testWhatsappFeedback, setTestWhatsappFeedback] = useState<string | null>(null);

  async function handleTestWhatsapp() {
    const num = normalizeWhatsapp(whatsappNumber);
    if (!num || num.length < 10) {
      setTestWhatsappFeedback('Informe um número de WhatsApp válido antes de testar.');
      return;
    }
    setTestingWhatsapp(true);
    setTestWhatsappFeedback(null);
    try {
      const res = await fetch(`/api/test-whatsapp?phone=${num}`);
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setTestWhatsappFeedback('✅ Mensagem do Assistente enviada com sucesso! Verifique seu WhatsApp.');
      } else {
        const detalhe = data.mensagem || (typeof data.corpoDaResposta === 'object' ? JSON.stringify(data.corpoDaResposta) : data.corpoDaResposta);
        setTestWhatsappFeedback(`❌ Falha no envio: ${detalhe || 'Verifique se o QR Code da Z-API está conectado.'}`);
      }
    } catch (err: any) {
      setTestWhatsappFeedback(`❌ Erro ao conectar com o servidor: ${err.message}`);
    } finally {
      setTestingWhatsapp(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      let logoUrl = company.logo_url;

      if (logoFile) {
        const path = `${company.id}/logo-${Date.now()}.${logoFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(path, logoFile, {
          upsert: true,
        });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('logos').getPublicUrl(path);
        logoUrl = data.publicUrl;
      }

      const whatsappNormalizado = normalizeWhatsapp(whatsappNumber);

      const { error } = await supabase
        .from('companies')
        .update({
          name,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          whatsapp_number: whatsappNormalizado,
          notification_email: notificationEmail || null,
          logo_url: logoUrl,
        })
        .eq('id', company.id);

      if (error) throw error;
      setWhatsappNumber(whatsappNormalizado);
      setMessage('Salvo com sucesso.');
      onSaved();
    } catch (err: any) {
      setMessage(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel-card" onSubmit={handleSave}>
      <h2>Identidade Visual & Notificações</h2>

      <label>
        Nome da Empresa
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>

      <div className="color-row">
        <label>
          Cor Principal
          <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
        </label>
        <label>
          Cor Secundária
          <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
        </label>
      </div>

      <label>
        Logo
        {company.logo_url && (
          <img src={company.logo_url} alt="Logo atual" className="logo-preview" />
        )}
        <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
      </label>

      <label>
        WhatsApp para receber os PDFs (com DDI e DDD, só números)
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <input
            type="tel"
            placeholder="5511999998888"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            disabled={testingWhatsapp || !whatsappNumber}
            onClick={handleTestWhatsapp}
            className="btn-secondary"
            style={{ whiteSpace: 'nowrap', padding: '0 12px', fontSize: '13px' }}
          >
            {testingWhatsapp ? 'Enviando...' : '📱 Testar Assistente'}
          </button>
        </div>
      </label>
      {testWhatsappFeedback && (
        <p className="panel-message" style={{ marginTop: '2px', marginBottom: '12px' }}>
          {testWhatsappFeedback}
        </p>
      )}

      <label>
        E-mail para receber os PDFs
        <input
          type="email"
          placeholder="contato@suaempresa.com.br"
          value={notificationEmail}
          onChange={(e) => setNotificationEmail(e.target.value)}
        />
      </label>

      <button type="submit" disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar Alterações'}
      </button>
      {message && <p className="panel-message">{message}</p>}
    </form>
  );
}
