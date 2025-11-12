import type { FormCollection } from '../derivation/types';
import type { SubmissionAdapter, SubmissionClientOptions, SubmitFormArgs } from './types';

export class FormSubmissionClient implements SubmissionAdapter {
  private endpoint: string;
  private headers: Record<string, string>;
  private fetchImpl: typeof fetch;

  constructor(options: SubmissionClientOptions) {
    this.endpoint = options.endpoint;
    this.headers = options.headers ?? { 'Content-Type': 'application/json' };
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async submit(args: SubmitFormArgs): Promise<Response> {
    const payload = buildPayload(args.collection, args.values);
    return this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
  }
}

function buildPayload(collection: FormCollection, values: Record<string, unknown>) {
  return {
    collectionId: collection.id,
    table: collection.storage?.table,
    storage: collection.storage,
    values,
  };
}
