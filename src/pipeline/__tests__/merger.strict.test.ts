import { describe, expect, it } from 'bun:test';
import { collectMergeConflicts, mergePayloads, PipelineWarningSeverity } from '..';

const aiOutput = {
  patient: 'AI string overwrite',
};

const nasData = {
  patient: {
    name: 'Sample Name',
  },
};

describe('merge conflict diagnostics', () => {
  it('captures type mismatches with severity metadata', () => {
    const conflicts = collectMergeConflicts(aiOutput, nasData);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].path).toBe('patient');
    expect(conflicts[0].severity).toBe(PipelineWarningSeverity.Error);
  });

  it('still merges payloads preferring AI output', () => {
    const payload = mergePayloads(aiOutput, nasData);
    expect(payload.patient).toBe('AI string overwrite');
  });
});
