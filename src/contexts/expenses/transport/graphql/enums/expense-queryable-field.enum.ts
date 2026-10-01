/**
 * Whitelist of the view-model fields a client may filter or sort the history
 * by. `groupId` is deliberately absent: the query handler scopes every
 * request to the requested group itself.
 */
export enum ExpenseQueryableField {
  ID = 'id',
  PAID_BY = 'paidBy',
  SPENT_ON = 'spentOn',
  AMOUNT_CENTS = 'amountCents',
  CATEGORY = 'category',
  SPLIT_TYPE = 'splitType',
  CREATED_AT = 'createdAt',
  DELETED_AT = 'deletedAt',
}
