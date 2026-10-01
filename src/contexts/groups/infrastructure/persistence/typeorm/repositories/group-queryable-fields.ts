import { Criteria } from '@sisques-labs/nestjs-kit';

export const GROUP_ALIAS = 'group';

/**
 * Entity properties a caller may filter or sort by. The query builder maps
 * each property to its column through the entity metadata; any other name is
 * rejected before it can reach SQL.
 */
const CRITERIA_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'name',
  'createdBy',
  'createdAt',
  'updatedAt',
]);

export function assertQueryableFields(criteria: Criteria): void {
  const fields = [...criteria.filters, ...criteria.sorts].map((c) => c.field);
  const unknown = fields.find((field) => !CRITERIA_FIELDS.has(field));
  if (unknown) {
    throw new Error(`Field "${unknown}" is not queryable on groups`);
  }
}
