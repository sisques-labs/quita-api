export enum ExpenseSplitType {
  /** Both members share the expense 50/50; the payer absorbs an odd cent. */
  EQUAL = 'EQUAL',
  /** The member who did not pay owes the whole amount. */
  OTHER_OWES_ALL = 'OTHER_OWES_ALL',
}
