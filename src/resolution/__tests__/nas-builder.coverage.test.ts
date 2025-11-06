import { describe, expect, it } from 'bun:test';
import { NASBuilder } from '../core/nas-builder';
import { StaticResolver } from '../core/static-resolver';
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

class PartialAwareResolver implements ISlotResolver {
  canResolve(slotType: string): boolean {
    return slotType === 'computed';
  }

  resolve(item: any, context: ResolutionContext): ResolvedField | null {
    if (!item.targetPath) {
      return null;
    }

    const nasSnapshot = context.partialNas as Record<string, unknown>;
    const source = nasSnapshot.bundle && (nasSnapshot.bundle as Record<string, unknown>).first;
    if (!source) {
      return null;
    }

    return {
      slotType: 'computed',
      path: item.targetPath,
      value: `summary:${String(source)}`,
    };
  }
}

class NullResolver implements ISlotResolver {
  constructor(private readonly slotType: string) {}

  canResolve(slotType: string): boolean {
    return slotType === this.slotType;
  }

  resolve(): ResolvedField | null {
    return null;
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
    expect(result.warnings[0].severity).toBe('warning');
  });

  it('exposes partial NAS snapshot to subsequent resolvers', async () => {
    const builder = new NASBuilder([new StaticResolver(), new PartialAwareResolver()]);

    const chainingTemplate: NoteTemplate = {
      ...template,
      layout: [
        {
          id: 'section',
          type: 'section',
          content: [
            {
              id: 'static-first',
              slot: 'static',
              targetPath: 'bundle.first',
              text: 'alpha',
              constraints: { required: true },
            },
            {
              id: 'computed-summary',
              slot: 'computed',
              targetPath: 'bundle.summary',
            },
          ],
        },
      ],
    };

    const result = await builder.build({
      template: chainingTemplate,
      sourceData: {},
      nasSchema: minimalSchema,
    });

    expect(result.nasData.bundle).toEqual({ first: 'alpha', summary: 'summary:alpha' });
  });

  it('marks required slot failures as error severity', async () => {
    const builder = new NASBuilder([new NullResolver('lookup')]);

    const requiredTemplate: NoteTemplate = {
      ...template,
      layout: [
        {
          id: 'section',
          type: 'section',
          content: [
            {
              id: 'required-lookup',
              slot: 'lookup',
              lookup: 'patient.name',
              targetPath: 'patient.name',
              constraints: { required: true },
            },
          ],
        },
      ],
    };

    const result = await builder.build({
      template: requiredTemplate,
      sourceData: {},
      nasSchema: minimalSchema,
    });

    expect(result.warnings.some(w => w.severity === 'error')).toBe(true);
  });
});
