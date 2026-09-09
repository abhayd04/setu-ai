export interface Scheme {
  scheme_id: string;
  scheme_name: string;
  purpose: "business" | "education";
  min_project_cost: number;
  max_project_cost: number | null;
  max_loan_amount: number;
  income_limit: number;
  interest_rate: number;
  tenure_months: number;
  moratorium_months: number;
  project_cost_coverage_pct: number;
  eligible_categories: string[];
  eligible_purposes: string[];
  eligible_gender: "any" | "female";
  required_documents: string[];
  policy_version: string;
  active: boolean;
}

export interface BeneficiaryProfile {
  profile_id: string;
  name?: string;
  income?: number;
  category?: string;
  location?: string;
  lat?: number;
  lng?: number;
  purpose?: "business" | "education";
  business_type?: string;
  project_cost?: number;
  requested_amount?: number;
  education_status?: string;
  language: string;
}
