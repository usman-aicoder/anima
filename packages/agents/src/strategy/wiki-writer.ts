import { WorldModelClient } from '@anima/core';
import type { ExtractedFact } from './types.js';

export async function writeFacts(
  company_name: string,
  facts: ExtractedFact[],
  written_by: string,
): Promise<void> {
  for (const fact of facts) {
    await WorldModelClient.companyWiki.set(
      company_name,
      fact.category,
      fact.key,
      fact.value,
      written_by,
    );
  }
}
