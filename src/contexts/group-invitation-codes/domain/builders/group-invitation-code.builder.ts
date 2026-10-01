import { GroupInvitationCodeAggregate } from '@contexts/group-invitation-codes/domain/aggregates/group-invitation-code.aggregate';
import { GroupInvitationCodeCreatedByValueObject } from '@contexts/group-invitation-codes/domain/value-objects/group-invitation-code-created-by/group-invitation-code-created-by.value-object';
import { InvitationCodeValueObject } from '@contexts/group-invitation-codes/domain/value-objects/invitation-code/invitation-code.value-object';
import { GroupInvitationCodeViewModel } from '@contexts/group-invitation-codes/domain/view-models/group-invitation-code.view-model';
import { Injectable } from '@nestjs/common';
import {
  BaseBuilder,
  DateValueObject,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

@Injectable()
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
    try {
      this.validateWithDefaults();

      return new GroupInvitationCodeAggregate({
        id: new UuidValueObject(this._id),
        createdAt: new DateValueObject(this._createdAt),
        updatedAt: new DateValueObject(this._updatedAt),
        groupId: new UuidValueObject(this._groupId),
        code: new InvitationCodeValueObject(this._code),
        createdBy: new GroupInvitationCodeCreatedByValueObject(this._createdBy),
        revokedAt: this._revokedAt
          ? new DateValueObject(this._revokedAt)
          : null,
      });
    } finally {
      this.reset();
    }
  }

  buildViewModel(): GroupInvitationCodeViewModel {
    try {
      this.validateWithDefaults();

      return new GroupInvitationCodeViewModel({
        id: this._id,
        createdAt: this._createdAt,
        updatedAt: this._updatedAt,
        groupId: this._groupId,
        code: new InvitationCodeValueObject(this._code).value,
        createdBy: this._createdBy,
        revokedAt: this._revokedAt,
      });
    } finally {
      this.reset();
    }
  }

  /** Clears the inherited and local fields so a reused instance starts clean. */
  private reset(): void {
    // `BaseBuilder` declares these without defaults, so `undefined` is the initial state.
    this._id = undefined as unknown as string;
    this._createdAt = undefined as unknown as Date;
    this._updatedAt = undefined as unknown as Date;
    this._groupId = '';
    this._code = '';
    this._createdBy = '';
    this._revokedAt = null;
  }

  private validateWithDefaults(): void {
    this._createdAt ??= new Date();
    this._updatedAt ??= this._createdAt;
    this.validate();
  }
}
