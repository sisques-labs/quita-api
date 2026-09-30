import { GroupCreatedEvent } from '@contexts/groups/domain/events/group-created/group-created.event';
import { GroupDeletedEvent } from '@contexts/groups/domain/events/group-deleted/group-deleted.event';
import { IGroup } from '@contexts/groups/domain/interfaces/group.interface';
import { GroupPrimitives } from '@contexts/groups/domain/primitives/group.primitives';
import { GroupCreatedByValueObject } from '@contexts/groups/domain/value-objects/group-created-by/group-created-by.value-object';
import { GroupNameValueObject } from '@contexts/groups/domain/value-objects/group-name/group-name.value-object';
import { BaseAggregate } from '@sisques-labs/nestjs-kit';

/** A shared space that isolates expenses and payments. */
export class GroupAggregate extends BaseAggregate {
  private readonly _name: GroupNameValueObject;
  private readonly _createdBy: GroupCreatedByValueObject;

  constructor(props: IGroup) {
    super(props.id, props.createdAt, props.updatedAt);
    this._name = props.name;
    this._createdBy = props.createdBy;
  }

  public create(): void {
    this.apply(
      new GroupCreatedEvent(
        this.generateEventMetadata(GroupCreatedEvent),
        this.toPrimitives(),
      ),
    );
  }

  public delete(): void {
    this.apply(
      new GroupDeletedEvent(
        this.generateEventMetadata(GroupDeletedEvent),
        this.toPrimitives(),
      ),
    );
  }

  get name(): GroupNameValueObject {
    return this._name;
  }

  get createdBy(): GroupCreatedByValueObject {
    return this._createdBy;
  }

  toPrimitives(): GroupPrimitives {
    return {
      id: this.id.value,
      name: this._name.value,
      createdBy: this._createdBy.value,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}
