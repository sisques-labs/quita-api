import { GroupViewModel } from '@contexts/groups/domain/view-models/group.view-model';
import { GroupResponseDto } from '@contexts/groups/transport/graphql/dtos/responses/group.response.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GroupGraphQLMapper {
  toResponseDtoFromViewModel(viewModel: GroupViewModel): GroupResponseDto {
    return {
      id: viewModel.id,
      name: viewModel.name,
      createdBy: viewModel.createdBy,
      createdAt: viewModel.createdAt,
    };
  }

  toResponseDtosFromViewModels(
    viewModels: GroupViewModel[],
  ): GroupResponseDto[] {
    return viewModels.map((viewModel) =>
      this.toResponseDtoFromViewModel(viewModel),
    );
  }
}
