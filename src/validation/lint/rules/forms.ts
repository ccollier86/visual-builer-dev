import type {
  FormCollection,
  FormField,
  FormGroup,
  FormSection,
  FormStep,
  NoteTemplate,
} from '../../../derivation/types';
import type { TemplateLintIssue } from '../../types';

type ReportFn = (issue: TemplateLintIssue) => void;

export function lintFormCollections(template: NoteTemplate, report: ReportFn): void {
  const collections = template.inputCollections ?? [];
  if (collections.length === 0) {
    return;
  }

  const collectionIds = new Set<string>();
  const collectionFieldMap = new Map<string, Set<string>>();
  const collectionPathMap = new Map<string, Map<string, string>>();

  for (const collection of collections) {
    const pathBase = `inputCollections.${collection.id}`;

    if (collectionIds.has(collection.id)) {
      reportIssue(report, 'form.collection.id.duplicate', 'Duplicate form collection id.', 'error', collection.id, pathBase);
    } else {
      collectionIds.add(collection.id);
    }

    if (!collection.storage || !collection.storage.table) {
      reportIssue(
        report,
        'form.collection.storage.missing',
        'Form collection must define storage.table so submissions can be persisted.',
        'error',
        collection.id,
        `${pathBase}.storage`
      );
    }

    if (!collection.steps || collection.steps.length === 0) {
      reportIssue(
        report,
        'form.collection.steps.empty',
        'Form collection must include at least one step.',
        'error',
        collection.id,
        `${pathBase}.steps`
      );
      continue;
    }

    const fieldIds = new Set<string>();
    const pathMap = new Map<string, string>();

    collectionFieldMap.set(collection.id, fieldIds);
    collectionPathMap.set(collection.id, pathMap);

    for (const step of collection.steps) {
      lintStep(step, collection, pathBase, fieldIds, pathMap, report);
    }
  }

  // Prefill validation after collecting field maps
  for (const collection of collections) {
    const pathBase = `inputCollections.${collection.id}`;
    const visitField = (field: FormField, currentPath: string) => {
      const prefill = field.defaults?.prefillFrom;
      if (!prefill) return;

      let targetCollectionId = collection.id;
      let targetFieldId = prefill;
      if (prefill.includes(':')) {
        const [collectionPart, fieldPart] = prefill.split(':');
        if (collectionPart && fieldPart) {
          targetCollectionId = collectionPart;
          targetFieldId = fieldPart;
        }
      }

      const targetSet = collectionFieldMap.get(targetCollectionId);
      if (!targetSet || !targetSet.has(targetFieldId)) {
        reportIssue(
          report,
          'form.field.prefill.unknown',
          `prefillFrom references unknown field "${prefill}"`,
          'error',
          collection.id,
          `${currentPath}.defaults`
        );
      }
    };

    forEachField(collection, pathBase, visitField);
  }
}

function lintStep(
  step: FormStep,
  collection: FormCollection,
  collectionPath: string,
  fieldIds: Set<string>,
  pathMap: Map<string, string>,
  report: ReportFn
): void {
  const stepPath = `${collectionPath}.steps.${step.id}`;
  if (!stepHasFields(step)) {
    reportIssue(
      report,
      'form.step.empty',
      `Form step "${step.title}" does not contain any fields.`,
      'warning',
      collection.id,
      stepPath
    );
  }

  if (Array.isArray(step.sections)) {
    const sectionIds = new Set<string>();
    for (const section of step.sections) {
      if (section.id) {
        if (sectionIds.has(section.id)) {
          reportIssue(
            report,
            'form.section.id.duplicate',
            'Duplicate section id within step.',
            'error',
            collection.id,
            `${stepPath}.sections.${section.id}`
          );
        } else {
          sectionIds.add(section.id);
        }
      }
      addFields(section.fields, collection, `${stepPath}.sections.${section.id ?? 'unnamed'}`, fieldIds, pathMap, report);
    }
  }

  if (Array.isArray(step.groups)) {
    const groupIds = new Set<string>();
    for (const group of step.groups) {
      if (groupIds.has(group.id)) {
        reportIssue(
          report,
          'form.group.id.duplicate',
          'Duplicate group id within step.',
          'error',
          collection.id,
          `${stepPath}.groups.${group.id}`
        );
      } else {
        groupIds.add(group.id);
      }

      if (
        group.repeatable &&
        typeof group.minItems === 'number' &&
        typeof group.maxItems === 'number' &&
        group.maxItems < group.minItems
      ) {
        reportIssue(
          report,
          'form.group.repeatable.bounds',
          'repeatable group cannot have maxItems less than minItems.',
          'error',
          collection.id,
          `${stepPath}.groups.${group.id}`
        );
      }

      addFields(group.fields, collection, `${stepPath}.groups.${group.id}`, fieldIds, pathMap, report);
    }
  }

  addFields(step.fields, collection, `${stepPath}.fields`, fieldIds, pathMap, report);
}

function addFields(
  fields: FormField[] | undefined,
  collection: FormCollection,
  basePath: string,
  fieldIds: Set<string>,
  pathMap: Map<string, string>,
  report: ReportFn
): void {
  if (!Array.isArray(fields)) return;

  for (const field of fields) {
    const fieldPath = `${basePath}.${field.id}`;
    if (fieldIds.has(field.id)) {
      reportIssue(
        report,
        'form.field.id.duplicate',
        `Duplicate field id "${field.id}" within form collection.`,
        'error',
        collection.id,
        fieldPath
      );
      continue;
    }
    fieldIds.add(field.id);

    if (field.repeatable && field.targetPath && !field.targetPath.includes('[]')) {
      reportIssue(
        report,
        'form.field.target.repeatable',
        'Repeatable fields with targetPath should reference an array (include []).',
        'warning',
        collection.id,
        fieldPath
      );
    }

    if (field.targetPath) {
      const existing = pathMap.get(field.targetPath);
      if (existing && existing !== field.id) {
        reportIssue(
          report,
          'form.field.target.duplicate',
          `Multiple fields map to the same targetPath "${field.targetPath}".`,
          'warning',
          collection.id,
          fieldPath
        );
      } else {
        pathMap.set(field.targetPath, field.id);
      }
    }
  }
}

function forEachField(collection: FormCollection, basePath: string, visitor: (field: FormField, path: string) => void): void {
  const visitFields = (fields: FormField[] | undefined, currentPath: string) => {
    if (!Array.isArray(fields)) return;
    for (const field of fields) {
      visitor(field, `${currentPath}.${field.id}`);
    }
  };

  for (const step of collection.steps ?? []) {
    visitFields(step.fields, `${basePath}.steps.${step.id}.fields`);
    for (const section of step.sections ?? []) {
      visitFields(section.fields, `${basePath}.steps.${step.id}.sections.${section.id ?? 'unnamed'}.fields`);
    }
    for (const group of step.groups ?? []) {
      visitFields(group.fields, `${basePath}.steps.${step.id}.groups.${group.id}.fields`);
    }
  }
}

function stepHasFields(step: FormStep): boolean {
  if (Array.isArray(step.fields) && step.fields.length > 0) {
    return true;
  }
  if (Array.isArray(step.sections)) {
    for (const section of step.sections) {
      if (section.fields && section.fields.length > 0) {
        return true;
      }
    }
  }
  if (Array.isArray(step.groups)) {
    for (const group of step.groups) {
      if (group.fields && group.fields.length > 0) {
        return true;
      }
    }
  }
  return false;
}

function reportIssue(
  report: ReportFn,
  code: string,
  message: string,
  severity: TemplateLintIssue['severity'],
  componentId: string,
  path: string
): void {
  report({ code, message, severity, componentId, path });
}
