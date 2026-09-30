import { GroupViewModel } from '@contexts/groups/domain/view-models/group.view-model';
import { GroupObject } from '@contexts/groups/transport/graphql/objects/group.object';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GroupGraphQLMapper {
  toObject(viewModel: GroupViewModel): GroupObject {
    return {
      id: viewModel.id,
      name: viewModel.name,
      createdBy: viewModel.createdBy,
      createdAt: viewModel.createdAt,
    };
  }

  toObjects(viewModels: GroupViewModel[]): GroupObject[] {
    return viewModels.map((viewModel) => this.toObject(viewModel));
  }
}
