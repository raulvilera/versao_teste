import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

      const { error } = await supabase
        .from('companies')
        .update({
          name,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          whatsapp_number: whatsappNumber,
          logo_url: logoUrl,
        })
        .eq('id', company.id);

      if (error) throw error;
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
      <h2>Identidade Visual</h2>

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
        <input
          type="tel"
          placeholder="5511999998888"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
        />
      </label>

      <button type="submit" disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar Identidade Visual'}
      </button>
      {message && <p className="panel-message">{message}</p>}
    </form>
  );
}
