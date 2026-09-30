import { GroupInvitationCodeCreatedEvent } from '@contexts/group-invitation-codes/domain/events/group-invitation-code-created/group-invitation-code-created.event';
import { GroupInvitationCodeRevokedEvent } from '@contexts/group-invitation-codes/domain/events/group-invitation-code-revoked/group-invitation-code-revoked.event';
import { IGroupInvitationCode } from '@contexts/group-invitation-codes/domain/interfaces/group-invitation-code.interface';
import { GroupInvitationCodePrimitives } from '@contexts/group-invitation-codes/domain/primitives/group-invitation-code.primitives';
import { GroupInvitationCodeCreatedByValueObject } from '@contexts/group-invitation-codes/domain/value-objects/group-invitation-code-created-by/group-invitation-code-created-by.value-object';
import { InvitationCodeValueObject } from '@contexts/group-invitation-codes/domain/value-objects/invitation-code/invitation-code.value-object';
import {
  BaseAggregate,
  DateValueObject,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

/**
 * A shareable code bound to one group. It is reusable and never expires: it
 * stays active until it is revoked (by regeneration).
 */
export class GroupInvitationCodeAggregate extends BaseAggregate {
  private readonly _groupId: UuidValueObject;
  private readonly _code: InvitationCodeValueObject;
  private readonly _createdBy: GroupInvitationCodeCreatedByValueObject;
  private _revokedAt: DateValueObject | null;

  constructor(props: IGroupInvitationCode) {
    super(props.id, props.createdAt, props.updatedAt);
    this._groupId = props.groupId;
    this._code = props.code;
    this._createdBy = props.createdBy;
    this._revokedAt = props.revokedAt;
  }

  create(): void {
    this.apply(
      new GroupInvitationCodeCreatedEvent(
        this.generateEventMetadata(GroupInvitationCodeCreatedEvent),
        this.toPrimitives(),
      ),
    );
  }

  /** Invalidates the code. Revoking twice keeps the first revocation. */
  revoke(at: Date): void {
    if (!this.isActive()) {
      return;
    }
    this._revokedAt = new DateValueObject(at);
    this.touch();
    this.apply(
      new GroupInvitationCodeRevokedEvent(
        this.generateEventMetadata(GroupInvitationCodeRevokedEvent),
        this.toPrimitives(),
      ),
    );
  }

  isActive(): boolean {
    return this._revokedAt === null;
  }

  get groupId(): UuidValueObject {
    return this._groupId;
  }

  get code(): InvitationCodeValueObject {
    return this._code;
  }

  get createdBy(): GroupInvitationCodeCreatedByValueObject {
    return this._createdBy;
  }

  get revokedAt(): DateValueObject | null {
    return this._revokedAt;
  }

  toPrimitives(): GroupInvitationCodePrimitives {
    return {
      id: this.id.value,
      groupId: this._groupId.value,
      code: this._code.value,
      createdBy: this._createdBy.value,
      revokedAt: this._revokedAt?.value ?? null,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}
