export type FieldType =
  | 'text'
  | 'date'
  | 'cpf'
  | 'phone'
  | 'email'
  | 'select'
  | 'number'
  | 'cep';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  enabled: boolean;
  options?: string[]; // usado quando type === 'select'
}

export interface FormSection {
  id: string;
  title: string;
  icon: string;
  enabled: boolean;
  repeatable?: boolean; // ex: experiências, dependentes
  fields: FormField[];
}

export type CompanyPlan = 'trial' | 'pro' | 'enterprise';
export type CompanyStatus = 'active' | 'blocked' | 'pending_payment';

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  apps_script_url: string | null;
  whatsapp_number: string | null;
  plan: CompanyPlan;
  status: CompanyStatus;
  trial_limit: number;
  submissions_count: number;
  created_at: string;
  updated_at: string;
}

export interface FormConfig {
  id: string;
  company_id: string;
  form_title: string;
  sections: FormSection[];
  updated_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  full_name: string | null;
  role: 'owner' | 'admin';
  created_at: string;
}
