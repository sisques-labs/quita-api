import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface ExpensesFindActiveByGroupQueryInput {
  groupId: string;
}

/** Trusted lookup for other contexts' ports; the caller checks membership itself. */
export class ExpensesFindActiveByGroupQuery {
  readonly groupId: UuidValueObject;

  constructor(input: ExpensesFindActiveByGroupQueryInput) {
    this.groupId = new UuidValueObject(input.groupId);
  }
}
