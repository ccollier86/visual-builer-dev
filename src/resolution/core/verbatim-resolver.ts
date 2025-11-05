import type { ContentItem } from '../../derivation/types';
import type { ISlotResolver, ResolutionContext, ResolvedField, SourceData, SourceRecord } from '../contracts/types';
import { getByPath } from '../../factory/utils/path-resolver';

/**
 * Resolves verbatim slots by extracting quotes with provenance tracking
 *
 * Responsibility: ONE - Extract verbatim quotes from source with ref tracking
 *
 * VerbatimRef format: "transcript:visit_123#t=40-55" or "document:intake#p=2"
 */
export class VerbatimResolver implements ISlotResolver {
  canResolve(slotType: string): boolean {
    return slotType === 'verbatim';
  }

  resolve(item: ContentItem, context: ResolutionContext): ResolvedField | null {
    if (!item.verbatimRef || !item.targetPath) {
      return null;
    }

    // Parse verbatimRef: "source:id#locator"
    const parsed = this.parseRef(item.verbatimRef);
    if (!parsed) return null;

    // Extract text from source
    const text = this.extractText(parsed, context.sourceData);
    if (!text) return null;

    // Return as {text, ref} object per spec
    return {
      path: item.targetPath,
      value: {
        text,
        ref: item.verbatimRef
      },
      slotType: 'verbatim'
    };
  }

  private parseRef(ref: string): { source: string; id: string; locator?: string } | null {
    // Format: "transcript:visit_123#t=40-55"
    const match = ref.match(/^([^:]+):([^#]+)(#(.+))?$/);
    if (!match) return null;

    return {
      source: match[1],      // "transcript"
      id: match[2],          // "visit_123"
      locator: match[4]      // "t=40-55"
    };
  }

  private extractText(
    parsed: { source: string; id: string; locator?: string },
    sourceData: SourceData
  ): string | null {
    // Get the source document/transcript
    const sourceObj = getByPath(sourceData, `${parsed.source}.${parsed.id}`);
    if (!isSourceRecord(sourceObj)) return null;

    // If no locator, return full text/content
    if (!parsed.locator) {
      const text = extractString(sourceObj.text) ?? extractString(sourceObj.content);
      return text ?? null;
    }

    // Parse time-based locator (t=40-55) or page-based (p=2)
    if (parsed.locator.startsWith('t=')) {
      return this.extractTimeRange(sourceObj, parsed.locator);
    } else if (parsed.locator.startsWith('p=')) {
      return this.extractPage(sourceObj, parsed.locator);
    }

    return null;
  }

  private extractTimeRange(sourceObj: SourceRecord, locator: string): string | null {
    // Parse "t=40-55" (seconds)
    const match = locator.match(/^t=(\d+)-(\d+)$/);
    if (!match) return null;

    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);

    // Extract from segments/timeline if available
    if (Array.isArray(sourceObj.segments)) {
      const segments = sourceObj.segments.filter(isTranscriptSegment);
      if (segments.length > 0) {
        return this.extractFromSegments(segments, start, end);
      }
    }

    // Fallback: return first N characters as approximation
    if (typeof sourceObj.text === 'string') {
      const charsPerSecond = 15; // rough estimate
      const startChar = start * charsPerSecond;
      const endChar = end * charsPerSecond;
      return sourceObj.text.slice(startChar, endChar);
    }

    return null;
  }

  private extractFromSegments(segments: TranscriptSegment[], start: number, end: number): string {
    return segments
      .filter(seg => seg.timestamp >= start && seg.timestamp <= end)
      .map(seg => seg.text)
      .join(' ');
  }

  private extractPage(sourceObj: SourceRecord, locator: string): string | null {
    // Parse "p=2"
    const match = locator.match(/^p=(\d+)$/);
    if (!match) return null;

    const page = parseInt(match[1], 10);

    if (Array.isArray(sourceObj.pages)) {
      const pages = sourceObj.pages.filter(isTranscriptPage);
      if (pages[page - 1]) {
        return pages[page - 1].text;
      }
    }

    return null;
  }
}

interface TranscriptSegment {
  timestamp: number;
  text: string;
}

interface TranscriptPage {
  text: string;
}

function isSourceRecord(value: unknown): value is SourceRecord {
  return typeof value === 'object' && value !== null;
}

function extractString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isTranscriptSegment(value: unknown): value is TranscriptSegment {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).timestamp === 'number' &&
    typeof (value as Record<string, unknown>).text === 'string'
  );
}

function isTranscriptPage(value: unknown): value is TranscriptPage {
  return typeof value === 'object' && value !== null && typeof (value as Record<string, unknown>).text === 'string';
}
