import { Sort, SortDirection } from '@sisques-labs/nestjs-kit';

/** History order: newest expense date first, ties broken by newest creation. */
export const DEFAULT_SORTS: Sort[] = [
  { field: 'spentOn', direction: SortDirection.DESC },
  { field: 'createdAt', direction: SortDirection.DESC },
];
