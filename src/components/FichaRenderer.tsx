import { useState } from 'react';
import type { Company, FormConfig, FormField } from '../types/formConfig';
import { maskCPF, maskPhone, maskCEP, buscarCEP } from '../utils/masks';
import { supabase } from '../lib/supabaseClient';

interface Props {
  company: Company;
  config: FormConfig;
  onSubmitted: () => void;
}

type SimpleValues = Record<string, string>;
type RepeatableValues = Record<string, Record<string, string>[]>;

export default function FichaRenderer({ company, config, onSubmitted }: Props) {
  const [values, setValues] = useState<SimpleValues>({});
  const [repeatable, setRepeatable] = useState<RepeatableValues>(() => {
    const initial: RepeatableValues = {};
    config.sections.filter((s) => s.repeatable).forEach((s) => {
      initial[s.id] = [{}];
    });
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function setValue(fieldId: string, raw: string, type: FormField['type']) {
    let v = raw;
    if (type === 'cpf') v = maskCPF(raw);
    if (type === 'phone') v = maskPhone(raw);
    if (type === 'cep') v = maskCEP(raw);
    setValues((prev) => ({ ...prev, [fieldId]: v }));

    if (type === 'cep' && v.replace(/\D/g, '').length === 8) {
      buscarCEP(v).then((result) => {
        if (!result) return;
        setValues((prev) => ({
          ...prev,
          logradouro: result.logradouro ?? prev.logradouro,
          bairro: result.bairro ?? prev.bairro,
          cidade: result.localidade ?? prev.cidade,
          estado: result.uf ?? prev.estado,
        }));
      });
    }
  }

  function setRepeatableValue(sectionId: string, index: number, fieldId: string, value: string) {
    setRepeatable((prev) => {
      const rows = [...(prev[sectionId] ?? [{}])];
      rows[index] = { ...rows[index], [fieldId]: value };
      return { ...prev, [sectionId]: rows };
    });
  }

  function addRow(sectionId: string) {
    setRepeatable((prev) => ({ ...prev, [sectionId]: [...(prev[sectionId] ?? []), {}] }));
  }

  function removeRow(sectionId: string, index: number) {
    setRepeatable((prev) => {
      const rows = [...(prev[sectionId] ?? [])];
      rows.splice(index, 1);
      return { ...prev, [sectionId]: rows.length ? rows : [{}] };
    });
  }

  function renderField(field: FormField) {
    if (!field.enabled) return null;
    const commonProps = {
      id: field.id,
      required: field.required,
    };

    if (field.type === 'select') {
      return (
        <select
          {...commonProps}
          value={values[field.id] ?? ''}
          onChange={(e) => setValue(field.id, e.target.value, field.type)}
        >
          <option value="">Selecione</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    const inputType = field.type === 'date' ? 'date'
      : field.type === 'email' ? 'email'
      : field.type === 'number' ? 'number'
      : 'text';

    return (
      <input
        {...commonProps}
        type={inputType}
        value={values[field.id] ?? ''}
        onChange={(e) => setValue(field.id, e.target.value, field.type)}
      />
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (company.submissions_count >= company.trial_limit && company.plan === 'trial') {
      setError('Esta empresa atingiu o limite de fichas do plano de teste.');
      return;
    }
    if (!company.apps_script_url) {
      setError('Esta empresa ainda não configurou o destino dos dados. Entre em contato com o RH.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, string> = { ...values };

      config.sections
        .filter((s) => s.repeatable)
        .forEach((s) => {
          const rows = (repeatable[s.id] ?? []).filter((row) =>
            Object.values(row).some((v) => v && v.trim())
          );
          payload[s.id] = JSON.stringify(rows);
        });

      payload.companyId = company.id;

      const body = new URLSearchParams(payload);
      const resp = await fetch(company.apps_script_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      let result: any;
      try {
        result = await resp.json();
      } catch {
        throw new Error('Erro de comunicação com a planilha da empresa.');
      }

      if (result.status !== 'ok') {
        throw new Error(result.mensagem || 'Erro desconhecido ao enviar.');
      }

      await supabase.rpc('increment_company_usage', { p_company_id: company.id });

      // Gera o PDF e dispara pro WhatsApp da empresa (não bloqueia a tela de sucesso
      // se isso falhar — os dados já estão salvos na planilha, que é o essencial).
      enviarPdfEWhatsapp(payload).catch((err) => console.error('Falha ao gerar/enviar PDF:', err));

      setSuccess(true);
      onSubmitted();
    } catch (err: any) {
      setError(err.message ?? 'Não foi possível enviar o formulário.');
    } finally {
      setSubmitting(false);
    }
  }

  async function enviarPdfEWhatsapp(payload: Record<string, string>) {
    // Monta uma versão "legível" (label + valor) para virar o PDF,
    // em vez dos ids técnicos usados no payload da planilha.
    const printableSections = config.sections
      .filter((s) => s.enabled)
      .map((section) => {
        if (section.repeatable) {
          const rows = (repeatable[section.id] ?? []).filter((row) =>
            Object.values(row).some((v) => v && v.trim())
          );
          return {
            title: section.title,
            rows: rows.flatMap((row, idx) =>
              section.fields
                .filter((f) => f.enabled)
                .map((f) => ({ label: `${section.title} ${idx + 1} — ${f.label}`, value: row[f.id] ?? '' }))
            ),
          };
        }
        return {
          title: section.title,
          rows: section.fields
            .filter((f) => f.enabled)
            .map((f) => ({ label: f.label, value: values[f.id] ?? '' })),
        };
      })
      .filter((s) => s.rows.length > 0);

    await fetch('/api/send-ficha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: company.id,
        formTitle: config.form_title,
        sections: printableSections,
      }),
    });
  }

  if (success) {
    return (
      <div className="ficha-success">
        <i className="fas fa-check-circle" />
        <h2>Cadastro enviado com sucesso!</h2>
        <p>Obrigado por preencher a ficha.</p>
      </div>
    );
  }

  return (
    <form className="ficha-form" onSubmit={handleSubmit}>
      <h1>{config.form_title}</h1>

      {config.sections.filter((s) => s.enabled).map((section) => (
        <div key={section.id} className="ficha-section">
          <h2><i className={`fas ${section.icon}`} /> {section.title}</h2>

          {!section.repeatable && (
            <div className="ficha-grid">
              {section.fields.filter((f) => f.enabled).map((field) => (
                <div key={field.id} className="ficha-field">
                  <label htmlFor={field.id}>
                    {field.label} {field.required && <span className="required">*</span>}
                  </label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          )}

          {section.repeatable && (
            <div>
              {(repeatable[section.id] ?? [{}]).map((row, index) => (
                <div key={index} className="ficha-grid ficha-repeatable-row">
                  {section.fields.filter((f) => f.enabled).map((field) => (
                    <div key={field.id} className="ficha-field">
                      <label>{field.label}</label>
                      <input
                        type={field.type === 'date' ? 'date' : 'text'}
                        value={row[field.id] ?? ''}
                        onChange={(e) => setRepeatableValue(section.id, index, field.id, e.target.value)}
                      />
                    </div>
                  ))}
                  <button type="button" className="remove-row" onClick={() => removeRow(section.id, index)}>
                    <i className="fas fa-minus-circle" /> Remover
                  </button>
                </div>
              ))}
              <button type="button" className="add-row" onClick={() => addRow(section.id)}>
                <i className="fas fa-plus-circle" /> Adicionar
              </button>
            </div>
          )}
        </div>
      ))}

      {error && <p className="ficha-error">{error}</p>}

      <button type="submit" className="ficha-submit" disabled={submitting}>
        {submitting ? 'Enviando...' : 'Enviar Cadastro'}
      </button>
    </form>
  );
}
