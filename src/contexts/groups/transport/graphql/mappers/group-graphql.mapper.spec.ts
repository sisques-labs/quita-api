import { GroupBuilder } from '@contexts/groups/domain/builders/group.builder';
import { GroupGraphQLMapper } from '@contexts/groups/transport/graphql/mappers/group-graphql.mapper';

const CREATED = new Date('2026-01-01T09:00:00Z');

const viewModel = (id: string, name: string, createdBy: string) =>
  new GroupBuilder()
    .withId(id)
    .withName(name)
    .withCreatedBy(createdBy)
    .withCreatedAt(CREATED)
    .buildViewModel();

describe('GroupGraphQLMapper', () => {
  const mapper = new GroupGraphQLMapper();

  it('maps a view model to a GraphQL object', () => {
    const vm = viewModel('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11', 'Home', 'A');

    expect(mapper.toResponseDtoFromViewModel(vm)).toEqual({
      id: '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
      name: 'Home',
      createdBy: 'A',
      createdAt: CREATED,
    });
  });

  it('maps every view model of a list, preserving order', () => {
    const dtos = mapper.toResponseDtosFromViewModels([
      viewModel('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11', 'Home', 'A'),
      viewModel('1c7f7c1f-7f1f-4e9b-8e1b-8e7f3f4b2d22', 'Trip', 'B'),
    ]);

    expect(dtos.map((dto) => dto.name)).toEqual(['Home', 'Trip']);
  });
});
