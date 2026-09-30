import { ExpenseUserIdValueObject } from '@contexts/expenses/domain/value-objects/expense-user-id/expense-user-id.value-object';
import {
  Criteria,
  IFindByCriteriaQueryDto,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

export interface ExpensesFindByCriteriaQueryInput {
  groupId: string;
  requesterId: string;
  criteria?: Criteria;
}

/**
 * `groupId` and `requesterId` are required top-level arguments (the requester
 * comes from the auth guard); they are never part of the client's filters.
 */
export class ExpensesFindByCriteriaQuery implements IFindByCriteriaQueryDto {
  readonly groupId: UuidValueObject;
  readonly requesterId: ExpenseUserIdValueObject;
  readonly criteria: Criteria;

  constructor(input: ExpensesFindByCriteriaQueryInput) {
    this.groupId = new UuidValueObject(input.groupId);
    this.requesterId = new ExpenseUserIdValueObject(input.requesterId);
    this.criteria = input.criteria ?? new Criteria();
  }
}
