import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface PaymentsFindActiveByGroupQueryInput {
  groupId: string;
}

/** Trusted lookup for other contexts' ports; the caller checks membership itself. */
export class PaymentsFindActiveByGroupQuery {
  readonly groupId: UuidValueObject;

  constructor(input: PaymentsFindActiveByGroupQueryInput) {
    this.groupId = new UuidValueObject(input.groupId);
  }
}
