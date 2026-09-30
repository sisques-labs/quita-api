import { PaymentEntity } from '@contexts/payments/infrastructure/persistence/typeorm/entities/payment.entity';
import {
  Criteria,
  Filter,
  FilterOperator,
  Sort,
} from '@sisques-labs/nestjs-kit';
import { applyCriteriaToQueryBuilder } from '@sisques-labs/nestjs-kit/typeorm';
import { SelectQueryBuilder } from 'typeorm';

export const PAYMENT_ALIAS = 'payment';

/**
 * Entity properties a caller may filter or sort by. The query builder maps
 * each property to its column through the entity metadata (`groupId` becomes
 * `group_id`); any other name is rejected before it can reach SQL.
 */
const CRITERIA_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'groupId',
  'fromUserId',
  'toUserId',
  'paidOn',
  'amountCents',
  'createdAt',
  'deletedAt',
]);

export function assertQueryableFields(criteria: Criteria): void {
  const fields = [...criteria.filters, ...criteria.sorts].map((c) => c.field);
  const unknown = fields.find((field) => !CRITERIA_FIELDS.has(field));
  if (unknown) {
    throw new Error(`Field "${unknown}" is not queryable on payments`);
  }
}

/**
 * Translates all 8 filter operators. The kit applies `ILIKE` straight to the
 * column, which Postgres rejects on `date` and `integer` columns, so `LIKE` is
 * handled here on the column cast to text.
 */
export function applyPaymentCriteria(
  qb: SelectQueryBuilder<PaymentEntity>,
  criteria: Criteria,
  defaultSort: Sort | Sort[],
): SelectQueryBuilder<PaymentEntity> {
  let likeCount = 0;
  return applyCriteriaToQueryBuilder(qb, criteria, {
    alias: PAYMENT_ALIAS,
    defaultSort,
    onCustomFilter: (builder, filter: Filter) => {
      if (filter.operator !== FilterOperator.LIKE) {
        return false;
      }
      const param = `likeFilter${likeCount++}`;
      builder.andWhere(
        `CAST(${PAYMENT_ALIAS}.${filter.field} AS text) ILIKE :${param}`,
        { [param]: `%${filter.value}%` },
      );
      return true;
    },
  });
}
