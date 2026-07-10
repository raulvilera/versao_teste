import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { FormConfig, FormSection } from '../types/formConfig';

interface Props {
  config: FormConfig;
  onSaved: () => void;
}

export default function FormBuilder({ config, onSaved }: Props) {
  const [title, setTitle] = useState(config.form_title);
  const [sections, setSections] = useState<FormSection[]>(
    JSON.parse(JSON.stringify(config.sections)) as FormSection[]
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    const { error } = await supabase
      .from('form_configs')
      .update({ form_title: title, sections })
      .eq('id', config.id);
    setSaving(false);
    if (error) {
      setMessage(`Erro ao salvar: ${error.message}`);
      return;
    }
    setMessage('Campos salvos com sucesso.');
    onSaved();
  }

  return (
    <div className="panel-card">
      <h2>Campos da Ficha</h2>

      <label>
        Título do formulário
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

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
