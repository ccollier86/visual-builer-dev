import { describe, expect, it } from 'bun:test';
import type { FormCollection } from '../../derivation/types';
import { CompositeSubmissionClient } from '../composite-submission-client';
import type { SubmissionAdapter, SubmitFormArgs } from '../types';

class MockAdapter implements SubmissionAdapter {
  public calls: SubmitFormArgs[] = [];
  async submit(args: SubmitFormArgs): Promise<unknown> {
    this.calls.push(args);
    return args.values;
  }
}

const mockCollection = (id: string): FormCollection => ({
  id,
  label: id,
  version: '1.0.0',
  audience: 'public',
  mode: 'async',
  delivery: ['web'],
  storage: { table: `${id}_table` },
  steps: [],
});

describe('CompositeSubmissionClient', () => {
  it('routes to per-collection handler when registered', async () => {
    const defaultAdapter = new MockAdapter();
    const composite = new CompositeSubmissionClient({ defaultAdapter });

    const handlerCalls: SubmitFormArgs[] = [];
    composite.registerHandler('special', async (args, next) => {
      handlerCalls.push(args);
      return next?.submit(args);
    });

    const collection = mockCollection('special');
    await composite.submit({ collection, values: { foo: 'bar' } });

    expect(handlerCalls).toHaveLength(1);
    expect(defaultAdapter.calls).toHaveLength(1);
  });

  it('throws when no handler or default adapter exists', async () => {
    const composite = new CompositeSubmissionClient({});
    const collection = mockCollection('missing');
    await expect(composite.submit({ collection, values: {} })).rejects.toThrow();
  });
});
