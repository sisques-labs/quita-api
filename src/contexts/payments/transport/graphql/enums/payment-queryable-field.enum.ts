/**
 * Whitelist of the view-model fields a client may filter or sort the history
 * by. `groupId` is deliberately absent: the query handler scopes every
 * request to the requested group itself.
 */
export enum PaymentQueryableField {
  ID = 'id',
  FROM_USER_ID = 'fromUserId',
  TO_USER_ID = 'toUserId',
  PAID_ON = 'paidOn',
  AMOUNT_CENTS = 'amountCents',
  CREATED_AT = 'createdAt',
  DELETED_AT = 'deletedAt',
}
