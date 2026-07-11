import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { slugify } from '../utils/masks';
import type { Company, FormConfig, FormSection } from '../types/formConfig';

interface Props {
  config: FormConfig;
  company: Company;
  onSaved: () => void;
}

export default function FormBuilder({ config, company, onSaved }: Props) {
  const [title, setTitle] = useState(config.form_title);
  const [slug, setSlug] = useState(company.slug);
  const [slugEditedManually, setSlugEditedManually] = useState(false);
  const [sections, setSections] = useState<FormSection[]>(
    JSON.parse(JSON.stringify(config.sections)) as FormSection[]
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const publicUrl = `${window.location.origin}/f/${slug || slugify(title)}`;

  function handleTitleChange(value: string) {
    setTitle(value);
    // Enquanto o usuário não editar o link manualmente, ele acompanha o título
    if (!slugEditedManually) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugEditedManually(true);
    setSlug(slugify(value));
  }

  function toggleSection(sectionId: string, enabled: boolean) {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, enabled } : s)));
  }

  function toggleField(sectionId: string, fieldId: string, enabled: boolean) {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : { ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, enabled } : f)) }
      )
    );
  }

  function toggleRequired(sectionId: string, fieldId: string, required: boolean) {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : { ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, required } : f)) }
      )
    );
  }

  function renameField(sectionId: string, fieldId: string, label: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : { ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, label } : f)) }
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const desiredSlug = slugify(slug) || slugify(title) || company.slug;

    // Verifica se o link já está em uso por outra empresa
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', desiredSlug)
      .neq('id', company.id)
      .maybeSingle();

    const finalSlug = existing ? `${desiredSlug}-${Math.random().toString(36).slice(2, 6)}` : desiredSlug;

    const { error: formError } = await supabase
      .from('form_configs')
      .update({ form_title: title, sections })
      .eq('id', config.id);

    const { error: slugError } =
      finalSlug !== company.slug
        ? await supabase.from('companies').update({ slug: finalSlug }).eq('id', company.id)
        : { error: null };

    setSaving(false);

    if (formError || slugError) {
      setMessage(`Erro ao salvar: ${(formError ?? slugError)?.message}`);
      return;
    }

    setSlug(finalSlug);
    setSlugEditedManually(false);
    setMessage(
      existing
        ? `Campos salvos. Esse link já estava em uso, então ajustamos para: ${window.location.origin}/f/${finalSlug}`
        : 'Campos e link personalizados salvos com sucesso.'
    );
    onSaved();
  }

  return (
    <div className="panel-card">
      <h2>Campos da Ficha</h2>

      <label>
        Título do formulário
        <input value={title} onChange={(e) => handleTitleChange(e.target.value)} />
      </label>

      <label>
        Link personalizado
        <div className="public-link-row">
          <span className="link-prefix">{window.location.origin}/f/</span>
          <input
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder={slugify(title)}
          />
        </div>
      </label>
      <p className="link-preview">
        Link atual: <strong>{publicUrl}</strong>
      </p>

      {sections.map((section) => (
        <div key={section.id} className="section-editor">
          <div className="section-editor-header">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={section.enabled}
                onChange={(e) => toggleSection(section.id, e.target.checked)}
              />
              <strong>{section.title}</strong>
              {section.repeatable && <span className="badge">repetível</span>}
            </label>
          </div>

          {section.enabled && (
            <div className="field-list">
              {section.fields.map((field) => (
                <div key={field.id} className="field-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={field.enabled}
                      onChange={(e) => toggleField(section.id, field.id, e.target.checked)}
                    />
                  </label>
                  <input
                    className="field-label-input"
                    value={field.label}
                    disabled={!field.enabled}
                    onChange={(e) => renameField(section.id, field.id, e.target.value)}
                  />
                  <label className="checkbox-label small">
                    <input
                      type="checkbox"
                      checked={field.required}
                      disabled={!field.enabled}
                      onChange={(e) => toggleRequired(section.id, field.id, e.target.checked)}
                    />
                    Obrigatório
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <button type="button" onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar Campos'}
      </button>
      {message && <p className="panel-message">{message}</p>}
    </div>
  );
}
