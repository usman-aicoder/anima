import { WorldModelClient, WIKI_KEYS, type PartnerRequirements } from '@anima/core';

interface VettingResult {
  provider_id: string;
  overall: 'pass' | 'fail' | 'warn';
  results: Array<{
    field: string;
    check_type: string;
    expected: string;
    actual: unknown;
    outcome: 'pass' | 'fail' | 'warn';
    failure_action: string;
  }>;
  recommended_status: string;
  summary: string;
}

export async function vetProvider(
  company_name: string,
  provider_id: string,
): Promise<string> {
  const [provider, requirements] = await Promise.all([
    WorldModelClient.providers.findById(provider_id),
    WorldModelClient.companyWiki.getTyped<PartnerRequirements>(
      company_name,
      WIKI_KEYS.PARTNER_REQUIREMENTS.category,
      WIKI_KEYS.PARTNER_REQUIREMENTS.key,
    ),
  ]);

  if (!provider) return `Provider ${provider_id} not found.`;
  if (!requirements) {
    return `No partner_requirements configured in company_wiki for ${company_name}. Cannot vet provider.`;
  }

  const result: VettingResult = {
    provider_id,
    overall: 'pass',
    results: [],
    recommended_status: 'vetted',
    summary: '',
  };

  // Flatten provider into a key-value map for easy field lookup
  const providerMap: Record<string, unknown> = {
    rut_certified: provider.rut_certified,
    active: provider.active,
    org_number: provider.org_number,
    contact_email: provider.contact_email,
    contact_phone: provider.contact_phone,
    contact_name: provider.contact_name,
    status: provider.status,
    verified_at: provider.verified_at,
  };

  let hasReject = false;
  let hasWarn = false;

  for (const criterion of requirements.vetting_criteria) {
    const actual = providerMap[criterion.field];
    let outcome: 'pass' | 'fail' | 'warn' = 'pass';

    switch (criterion.check_type) {
      case 'boolean':
        outcome = actual === true ? 'pass' : criterion.failure_action === 'reject' ? 'fail' : 'warn';
        break;
      case 'exact':
        outcome = String(actual) === criterion.expected_value ? 'pass' :
          criterion.failure_action === 'reject' ? 'fail' : 'warn';
        break;
      case 'regex': {
        const re = new RegExp(criterion.expected_value);
        outcome = re.test(String(actual ?? '')) ? 'pass' :
          criterion.failure_action === 'reject' ? 'fail' : 'warn';
        break;
      }
      case 'range': {
        const [min, max] = criterion.expected_value.split('-').map(Number);
        const num = Number(actual);
        outcome = (!isNaN(num) && num >= (min ?? 0) && num <= (max ?? Infinity)) ? 'pass' :
          criterion.failure_action === 'reject' ? 'fail' : 'warn';
        break;
      }
    }

    if (outcome === 'fail') hasReject = true;
    if (outcome === 'warn') hasWarn = true;

    result.results.push({
      field: criterion.field,
      check_type: criterion.check_type,
      expected: criterion.expected_value,
      actual,
      outcome,
      failure_action: criterion.failure_action,
    });
  }

  if (hasReject) {
    result.overall = 'fail';
    result.recommended_status = 'interested'; // keep at current stage, do not advance
  } else if (hasWarn) {
    result.overall = 'warn';
    result.recommended_status = 'vetted';
  } else {
    result.overall = 'pass';
    result.recommended_status = 'vetted';
  }

  const failedFields = result.results.filter((r) => r.outcome !== 'pass').map((r) => r.field);
  result.summary = result.overall === 'pass'
    ? `Provider ${provider.company_name} passed all ${requirements.vetting_criteria.length} criteria.`
    : `Provider ${provider.company_name} failed criteria: ${failedFields.join(', ')}.`;

  return JSON.stringify(result, null, 2);
}
