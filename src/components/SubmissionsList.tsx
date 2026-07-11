import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import type { FormConfig, Submission } from '../types/formConfig';

interface Props {
  companyId: string;
  config: FormConfig | null;
}

export default function SubmissionsList({ companyId, config }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [gerandoExcel, setGerandoExcel] = useState(false);

  useEffect(() => {
    supabase
      .from('submissions')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSubmissions((data as Submission[]) ?? []);
        setLoading(false);
      });
  }, [companyId]);

  async function baixarPdf(sub: Submission) {
    if (!sub.pdf_path) return;
    setBaixando(sub.id);
    try {
      const { data, error } = await supabase.storage
        .from('fichas-pdf')
        .createSignedUrl(sub.pdf_path, 60 * 5); // link válido por 5 minutos

      if (error || !data) throw error ?? new Error('Não foi possível gerar o link.');
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      alert('Erro ao gerar o link do PDF. Tente novamente.');
    } finally {
      setBaixando(null);
    }
  }

  function nomeDoRegistro(sub: Submission): string {
    const data = sub.data as Record<string, string>;
    return data.nomeCompleto || data.nome || 'Ficha sem nome identificado';
  }

  // Monta um mapa "id do campo -> rótulo legível" a partir da configuração
  // atual do formulário (ex: "nomeCompleto" -> "Nome Completo"). Se um campo
  // não for mais encontrado na config (foi removido depois), usa o próprio id.
  function montarMapaDeRotulos(): { rotulos: Record<string, string>; repetiveis: Set<string> } {
    const rotulos: Record<string, string> = {};
    const repetiveis = new Set<string>();

    (config?.sections ?? []).forEach((section) => {
      if (section.repeatable) {
        repetiveis.add(section.id);
        rotulos[section.id] = section.title;
      } else {
        section.fields.forEach((field) => {
          rotulos[field.id] = field.label;
        });
      }
    });

    return { rotulos, repetiveis };
  }

  // Converte a string JSON de uma seção repetível (ex: dependentes) em texto
  // legível para caber numa única célula da planilha.
  function formatarValorRepetivel(valorBruto: unknown): string {
    if (typeof valorBruto !== 'string') return '';
    try {
      const lista = JSON.parse(valorBruto);
      if (!Array.isArray(lista) || lista.length === 0) return '';
      return lista
        .map((item) =>
          Object.entries(item)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ')
        )
        .join('  ///  ');
    } catch {
      return String(valorBruto);
    }
  }

  function gerarExcel() {
    setGerandoExcel(true);
    try {
      const { rotulos, repetiveis } = montarMapaDeRotulos();

      const linhas = submissions.map((sub) => {
        const dados = sub.data as Record<string, unknown>;
        const linha: Record<string, string> = {
          'Data do Envio': new Date(sub.created_at).toLocaleString('pt-BR'),
        };

        Object.entries(dados).forEach(([chave, valor]) => {
          const rotulo = rotulos[chave] ?? chave;
          linha[rotulo] = repetiveis.has(chave)
            ? formatarValorRepetivel(valor)
            : String(valor ?? '');
        });

        return linha;
      });

      const planilha = XLSX.utils.json_to_sheet(linhas);
      const livro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(livro, planilha, 'Respostas');

      const nomeArquivo = `respostas-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(livro, nomeArquivo);
    } finally {
      setGerandoExcel(false);
    }
  }

  if (loading) {
    return (
      <div className="panel-card">
        <h2>Respostas Recebidas</h2>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="panel-card">
      <div className="submissions-header">
        <h2>Respostas Recebidas ({submissions.length})</h2>
        {submissions.length > 0 && (
          <button type="button" onClick={gerarExcel} disabled={gerandoExcel}>
            {gerandoExcel ? 'Gerando...' : 'Baixar Excel (todas as respostas)'}
          </button>
        )}
      </div>

      {submissions.length === 0 && <p>Nenhuma ficha enviada ainda.</p>}
      {submissions.length > 0 && (
        <div className="table-scroll">
          <table className="submissions-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Data do Envio</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id}>
                  <td>{nomeDoRegistro(sub)}</td>
                  <td>{new Date(sub.created_at).toLocaleString('pt-BR')}</td>
                  <td>
                    <button type="button" onClick={() => baixarPdf(sub)} disabled={baixando === sub.id}>
                      {baixando === sub.id ? 'Gerando link...' : 'Baixar PDF'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
