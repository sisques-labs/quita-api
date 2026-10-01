import { PaymentUserIdValueObject } from '@contexts/payments/domain/value-objects/payment-user-id/payment-user-id.value-object';
import {
  Criteria,
  IFindByCriteriaQueryDto,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

export interface PaymentsFindByCriteriaQueryInput {
  groupId: string;
  requesterId: string;
  criteria?: Criteria;
}

/**
 * `groupId` and `requesterId` are required top-level arguments (the requester
 * comes from the auth guard); they are never part of the client's filters.
 */
export class PaymentsFindByCriteriaQuery implements IFindByCriteriaQueryDto {
  readonly groupId: UuidValueObject;
  readonly requesterId: PaymentUserIdValueObject;
  readonly criteria: Criteria;

  constructor(input: PaymentsFindByCriteriaQueryInput) {
    this.groupId = new UuidValueObject(input.groupId);
    this.requesterId = new PaymentUserIdValueObject(input.requesterId);
    this.criteria = input.criteria ?? new Criteria();
  }
}
