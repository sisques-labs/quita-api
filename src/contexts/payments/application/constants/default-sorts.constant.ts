import { Sort, SortDirection } from '@sisques-labs/nestjs-kit';

/** History order: newest payment date first, ties broken by newest creation. */
export const DEFAULT_SORTS: Sort[] = [
  { field: 'paidOn', direction: SortDirection.DESC },
  { field: 'createdAt', direction: SortDirection.DESC },
];
