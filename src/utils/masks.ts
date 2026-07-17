export function maskCPF(value: string): string {
  let v = value.replace(/\D/g, '').slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return v;
}

export function maskPhone(value: string): string {
  let v = value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 10) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (v.length > 6) {
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  } else if (v.length > 0) {
    v = v.replace(/^(\d{0,2})/, '($1');
  }
  return v;
}

export function maskCEP(value: string): string {
  let v = value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) {
    v = v.replace(/^(\d{5})(\d)/, '$1-$2');
  }
  return v;
}

export interface ViaCepResult {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function buscarCEP(cep: string): Promise<ViaCepResult | null> {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
  const data = await resp.json();
  if (data.erro) return null;
  return data as ViaCepResult;
}

// Garante que o número tenha o DDI 55 na frente. Se a pessoa digitar só
// DDD + número (10 ou 11 dígitos, formato mais comum de digitar sem pensar
// no DDI), adiciona o 55 automaticamente. Se já vier com DDI (12-13
// dígitos), não mexe.
export function normalizeWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}
