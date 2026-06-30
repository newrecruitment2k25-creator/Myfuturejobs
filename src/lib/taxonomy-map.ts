export const OCCUPATION_SYNONYMS: Record<string, string[]> = {
  'software engineer': ['software developer', 'programmer', 'coder', 'web developer', 'application developer', 'systems developer'],
  'software developer': ['software engineer', 'programmer', 'coder', 'web developer', 'application developer'],
  'system engineer': ['systems engineer', 'infrastructure engineer', 'it engineer', 'network engineer'],
  'data analyst': ['data scientist', 'business analyst', 'analytics engineer', 'bi analyst'],
  'accountant': ['accounts executive', 'finance executive', 'audit executive', 'financial analyst'],
  'marketing executive': ['marketing officer', 'digital marketer', 'brand executive', 'marketing coordinator'],
  'hr executive': ['human resource executive', 'hr officer', 'people operations', 'talent acquisition'],
  'admin assistant': ['administrative assistant', 'office admin', 'clerk', 'administrative officer'],
  'project manager': ['programme manager', 'delivery manager', 'scrum master'],
  'graphic designer': ['visual designer', 'ui designer', 'creative designer'],
  'network engineer': ['network administrator', 'system administrator', 'it administrator', 'network technician'],
  'civil engineer': ['structural engineer', 'site engineer', 'construction engineer'],
  'mechanical engineer': ['manufacturing engineer', 'production engineer', 'maintenance engineer'],
  'electrical engineer': ['electronics engineer', 'instrumentation engineer', 'power engineer'],
  'nurse': ['staff nurse', 'nursing officer', 'registered nurse', 'clinical nurse'],
  'teacher': ['educator', 'instructor', 'lecturer', 'tutor', 'trainer'],
  'customer service': ['customer support', 'call centre agent', 'helpdesk officer', 'client relations'],
  'sales executive': ['sales representative', 'business development executive', 'account manager', 'sales officer'],
  'logistics coordinator': ['supply chain coordinator', 'freight forwarder', 'warehouse coordinator', 'operations coordinator'],
  'it support': ['technical support', 'helpdesk technician', 'desktop support', 'it technician'],
};

export function expandKeywords(keyword: string): string[] {
  const lower = keyword.toLowerCase().trim();
  const expanded: string[] = [lower];
  for (const [key, synonyms] of Object.entries(OCCUPATION_SYNONYMS)) {
    const allTerms = [key, ...synonyms];
    if (allTerms.some(t => lower.includes(t) || t.includes(lower))) {
      expanded.push(key, ...synonyms);
    }
  }
  return [...new Set(expanded)];
}
