import { GroupPrimitives } from '@contexts/groups/domain/primitives/group.primitives';
import { BaseViewModel } from '@sisques-labs/nestjs-kit';

/** Read-side projection of a group. */
export class GroupViewModel extends BaseViewModel {
  readonly name: string;
  readonly createdBy: string;

  constructor(props: GroupPrimitives) {
    super(props.id, props.createdAt, props.updatedAt);
    this.name = props.name;
    this.createdBy = props.createdBy;
  }
}
