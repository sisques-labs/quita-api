import { GroupAggregate } from '@contexts/groups/domain/aggregates/group.aggregate';
import { GroupViewModel } from '@contexts/groups/domain/view-models/group.view-model';
import { GroupCreatedByValueObject } from '@contexts/groups/domain/value-objects/group-created-by/group-created-by.value-object';
import { GroupNameValueObject } from '@contexts/groups/domain/value-objects/group-name/group-name.value-object';
import {
  BaseBuilder,
  DateValueObject,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

export class GroupBuilder extends BaseBuilder<GroupAggregate, GroupViewModel> {
  private _name = '';
  private _createdBy = '';

  withName(name: string): this {
    this._name = name;
    return this;
  }

  withCreatedBy(createdBy: string): this {
    this._createdBy = createdBy;
    return this;
  }

  build(): GroupAggregate {
    this.validateWithDefaults();

    return new GroupAggregate({
      id: new UuidValueObject(this._id),
      createdAt: new DateValueObject(this._createdAt),
      updatedAt: new DateValueObject(this._updatedAt),
      name: new GroupNameValueObject(this._name),
      createdBy: new GroupCreatedByValueObject(this._createdBy),
    });
  }

  buildViewModel(): GroupViewModel {
    this.validateWithDefaults();

    return new GroupViewModel({
      id: this._id,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      name: this._name,
      createdBy: this._createdBy,
    });
  }

  private validateWithDefaults(): void {
    this._createdAt ??= new Date();
    this._updatedAt ??= this._createdAt;
    this.validate();
  }
}
