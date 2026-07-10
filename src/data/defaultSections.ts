import type { FormSection } from '../types/formConfig';

export const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
];

export const defaultSections: FormSection[] = [
  {
    id: 'dados_pessoais',
    title: 'Dados Pessoais',
    icon: 'fa-user',
    enabled: true,
    fields: [
      { id: 'nomeCompleto', label: 'Nome Completo', type: 'text', required: true, enabled: true },
      { id: 'dataNascimento', label: 'Data de Nascimento', type: 'date', required: true, enabled: true },
      { id: 'cpf', label: 'CPF', type: 'cpf', required: true, enabled: true },
      { id: 'rg', label: 'RG', type: 'text', required: true, enabled: true },
      { id: 'tituloEleitor', label: 'Título de Eleitor', type: 'text', required: false, enabled: false },
      { id: 'estadoCivil', label: 'Estado Civil', type: 'select', required: false, enabled: true,
        options: ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'] },
      { id: 'genero', label: 'Gênero', type: 'select', required: false, enabled: true,
        options: ['Feminino', 'Masculino', 'Outro'] },
    ],
  },
  {
    id: 'dados_pais',
    title: 'Dados dos Pais',
    icon: 'fa-users',
    enabled: false,
    fields: [
      { id: 'nomePai', label: 'Nome do Pai', type: 'text', required: false, enabled: true },
      { id: 'cpfPai', label: 'CPF do Pai', type: 'cpf', required: false, enabled: true },
      { id: 'nomeMae', label: 'Nome da Mãe', type: 'text', required: true, enabled: true },
      { id: 'cpfMae', label: 'CPF da Mãe', type: 'cpf', required: false, enabled: true },
    ],
  },
  {
    id: 'endereco_contato',
    title: 'Endereço e Contato',
    icon: 'fa-map-marked-alt',
    enabled: true,
    fields: [
      { id: 'cep', label: 'CEP', type: 'cep', required: true, enabled: true },
      { id: 'logradouro', label: 'Logradouro', type: 'text', required: true, enabled: true },
      { id: 'numero', label: 'Número', type: 'text', required: true, enabled: true },
      { id: 'complemento', label: 'Complemento', type: 'text', required: false, enabled: true },
      { id: 'bairro', label: 'Bairro', type: 'text', required: true, enabled: true },
      { id: 'cidade', label: 'Cidade', type: 'text', required: true, enabled: true },
      { id: 'estado', label: 'Estado', type: 'select', required: true, enabled: true, options: ESTADOS_BR },
      { id: 'celular1', label: 'Celular 1', type: 'phone', required: true, enabled: true },
      { id: 'celular2', label: 'Celular 2', type: 'phone', required: false, enabled: true },
      { id: 'email', label: 'E-mail', type: 'email', required: true, enabled: true },
    ],
  },
  {
    id: 'escolaridade',
    title: 'Escolaridade',
    icon: 'fa-graduation-cap',
    enabled: true,
    fields: [
      { id: 'escolaridade', label: 'Escolaridade', type: 'select', required: false, enabled: true,
        options: ['Ensino Fundamental Incompleto', 'Ensino Fundamental Completo', 'Ensino Médio Incompleto',
          'Ensino Médio Completo', 'Ensino Superior Incompleto', 'Ensino Superior Completo',
          'Pós-graduação', 'Mestrado', 'Doutorado'] },
      { id: 'curso', label: 'Curso', type: 'text', required: false, enabled: true },
      { id: 'instituicao', label: 'Instituição', type: 'text', required: false, enabled: true },
      { id: 'anoConclusao', label: 'Ano de Conclusão', type: 'number', required: false, enabled: true },
    ],
  },
  {
    id: 'experiencias',
    title: 'Experiências Profissionais',
    icon: 'fa-briefcase',
    enabled: true,
    repeatable: true,
    fields: [
      { id: 'empresa', label: 'Empresa', type: 'text', required: false, enabled: true },
      { id: 'cargo', label: 'Cargo', type: 'text', required: false, enabled: true },
      { id: 'periodo', label: 'Período', type: 'text', required: false, enabled: true },
    ],
  },
  {
    id: 'dependentes',
    title: 'Dependentes',
    icon: 'fa-users',
    enabled: true,
    repeatable: true,
    fields: [
      { id: 'nome', label: 'Nome', type: 'text', required: false, enabled: true },
      { id: 'parentesco', label: 'Parentesco', type: 'text', required: false, enabled: true },
      { id: 'dataNascimento', label: 'Data Nascimento', type: 'date', required: false, enabled: true },
    ],
  },
];
