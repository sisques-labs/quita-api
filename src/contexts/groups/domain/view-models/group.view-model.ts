import { BaseViewModel } from '@sisques-labs/nestjs-kit';

/** Read-side projection of a group. */
export class GroupViewModel extends BaseViewModel {
  constructor(
    id: string,
    createdAt: Date,
    updatedAt: Date,
    readonly name: string,
    readonly createdBy: string,
  ) {
    super(id, createdAt, updatedAt);
  }
}
