import { describe, expect, it } from 'bun:test';
import { NASBuilder } from '../core/nas-builder';
import type { ISlotResolver, ResolutionContext, ResolvedField } from '../contracts/types';
import type { DerivedSchema, NoteTemplate } from '../../derivation/types';

class MismatchedResolver implements ISlotResolver {
  canResolve(slotType: string): boolean {
    return slotType === 'lookup';
  }

  resolve(item: any, _context: ResolutionContext): ResolvedField | null {
    return {
      slotType: 'lookup',
      path: 'unexpected.path',
      value: 'value',
    };
  }
}

const template: NoteTemplate = {
  id: 'coverage-test',
  name: 'Coverage Test',
  version: '0.0.1',
  layout: [
    {
      id: 'section',
      type: 'section',
      content: [
        {
          id: 'lookup-field',
          slot: 'lookup',
          targetPath: 'expected.path',
        },
      ],
    },
  ],
};

const minimalSchema: DerivedSchema = {
  $id: 'test-schema',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Test Schema',
  type: 'object',
  properties: {},
  additionalProperties: false,
};

describe('NASBuilder coverage detection', () => {
  it('adds unresolved warnings when slot output path does not match target', async () => {
    const builder = new NASBuilder([new MismatchedResolver()]);

    const result = await builder.build({
      template,
      sourceData: {},
      nasSchema: minimalSchema,
    });

    expect(result.unresolvedSlots.length).toBe(1);
    expect(result.warnings.some((w) => w.reason === 'unresolved_slot')).toBe(true);
    expect(result.warnings[0].path).toBe('expected.path');
  });
});
