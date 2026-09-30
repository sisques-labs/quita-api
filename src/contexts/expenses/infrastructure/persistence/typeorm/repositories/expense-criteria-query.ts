import { ExpenseEntity } from '@contexts/expenses/infrastructure/persistence/typeorm/entities/expense.entity';
import {
  Criteria,
  Filter,
  FilterOperator,
  Sort,
} from '@sisques-labs/nestjs-kit';
import { applyCriteriaToQueryBuilder } from '@sisques-labs/nestjs-kit/typeorm';
import { SelectQueryBuilder } from 'typeorm';

export const EXPENSE_ALIAS = 'expense';

/**
 * Entity properties a caller may filter or sort by. The query builder maps
 * each property to its column through the entity metadata (`groupId` becomes
 * `group_id`); any other name is rejected before it can reach SQL.
 */
const CRITERIA_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'groupId',
  'paidBy',
  'spentOn',
  'amountCents',
  'category',
  'splitType',
  'createdAt',
  'deletedAt',
]);

export function assertQueryableFields(criteria: Criteria): void {
  const fields = [...criteria.filters, ...criteria.sorts].map((c) => c.field);
  const unknown = fields.find((field) => !CRITERIA_FIELDS.has(field));
  if (unknown) {
    throw new Error(`Field "${unknown}" is not queryable on expenses`);
  }
}

/**
 * Translates all 8 filter operators. The kit applies `ILIKE` straight to the
 * column, which Postgres rejects on `date` and `integer` columns, so `LIKE` is
 * handled here on the column cast to text.
 */
export function applyExpenseCriteria(
  qb: SelectQueryBuilder<ExpenseEntity>,
  criteria: Criteria,
  defaultSort: Sort | Sort[],
): SelectQueryBuilder<ExpenseEntity> {
  let likeCount = 0;
  return applyCriteriaToQueryBuilder(qb, criteria, {
    alias: EXPENSE_ALIAS,
    defaultSort,
    onCustomFilter: (builder, filter: Filter) => {
      if (filter.operator !== FilterOperator.LIKE) {
        return false;
      }
      const param = `likeFilter${likeCount++}`;
      builder.andWhere(
        `CAST(${EXPENSE_ALIAS}.${filter.field} AS text) ILIKE :${param}`,
        { [param]: `%${filter.value}%` },
      );
      return true;
    },
  });
}
