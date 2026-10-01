import { GroupInvitationCodeCreatedByValueObject } from '@contexts/group-invitation-codes/domain/value-objects/group-invitation-code-created-by/group-invitation-code-created-by.value-object';
import { InvitationCodeValueObject } from '@contexts/group-invitation-codes/domain/value-objects/invitation-code/invitation-code.value-object';
import {
  DateValueObject,
  IBaseAggregate,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

export interface IGroupInvitationCode extends IBaseAggregate {
  groupId: UuidValueObject;
  code: InvitationCodeValueObject;
  createdBy: GroupInvitationCodeCreatedByValueObject;
  revokedAt: DateValueObject | null;
}
