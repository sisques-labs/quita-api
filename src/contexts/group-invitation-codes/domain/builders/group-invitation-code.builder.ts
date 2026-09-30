import { GroupInvitationCodeAggregate } from '@contexts/group-invitation-codes/domain/aggregates/group-invitation-code.aggregate';
import { GroupInvitationCodeCreatedByValueObject } from '@contexts/group-invitation-codes/domain/value-objects/group-invitation-code-created-by/group-invitation-code-created-by.value-object';
import { InvitationCodeValueObject } from '@contexts/group-invitation-codes/domain/value-objects/invitation-code/invitation-code.value-object';
import { GroupInvitationCodeViewModel } from '@contexts/group-invitation-codes/domain/view-models/group-invitation-code.view-model';
import {
  BaseBuilder,
  DateValueObject,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

export class GroupInvitationCodeBuilder extends BaseBuilder<
  GroupInvitationCodeAggregate,
  GroupInvitationCodeViewModel
> {
  private _groupId = '';
  private _code = '';
  private _createdBy = '';
  private _revokedAt: Date | null = null;

  withGroupId(groupId: string): this {
    this._groupId = groupId;
    return this;
  }

  withCode(code: string): this {
    this._code = code;
    return this;
  }

  withCreatedBy(createdBy: string): this {
    this._createdBy = createdBy;
    return this;
  }

  withRevokedAt(revokedAt: Date | null): this {
    this._revokedAt = revokedAt;
    return this;
  }

  build(): GroupInvitationCodeAggregate {
    this.validateWithDefaults();

    return new GroupInvitationCodeAggregate({
      id: new UuidValueObject(this._id),
      createdAt: new DateValueObject(this._createdAt),
      updatedAt: new DateValueObject(this._updatedAt),
      groupId: new UuidValueObject(this._groupId),
      code: new InvitationCodeValueObject(this._code),
      createdBy: new GroupInvitationCodeCreatedByValueObject(this._createdBy),
      revokedAt: this._revokedAt ? new DateValueObject(this._revokedAt) : null,
    });
  }

  buildViewModel(): GroupInvitationCodeViewModel {
    this.validateWithDefaults();

    return new GroupInvitationCodeViewModel(
      this._id,
      this._createdAt,
      this._updatedAt,
      this._groupId,
      new InvitationCodeValueObject(this._code).value,
      this._createdBy,
      this._revokedAt,
    );
  }

  private validateWithDefaults(): void {
    this._createdAt ??= new Date();
    this._updatedAt ??= this._createdAt;
    this.validate();
  }
}
