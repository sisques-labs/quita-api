import { GroupCreatedByValueObject } from '@contexts/groups/domain/value-objects/group-created-by/group-created-by.value-object';
import { GroupNameValueObject } from '@contexts/groups/domain/value-objects/group-name/group-name.value-object';
import { IBaseAggregate } from '@sisques-labs/nestjs-kit';

export interface IGroup extends IBaseAggregate {
  name: GroupNameValueObject;
  createdBy: GroupCreatedByValueObject;
}
