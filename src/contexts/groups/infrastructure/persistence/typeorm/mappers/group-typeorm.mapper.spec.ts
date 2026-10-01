import { GroupBuilder } from '@contexts/groups/domain/builders/group.builder';
import { GroupEntity } from '@contexts/groups/infrastructure/persistence/typeorm/entities/group.entity';
import { GroupTypeormMapper } from '@contexts/groups/infrastructure/persistence/typeorm/mappers/group-typeorm.mapper';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const CREATED = new Date('2026-01-01T09:00:00Z');
const UPDATED = new Date('2026-01-02T09:00:00Z');

const entity = Object.assign(new GroupEntity(), {
  id: GROUP_ID,
  name: 'Home',
  createdBy: 'user_A',
  createdAt: CREATED,
  updatedAt: UPDATED,
});

describe('GroupTypeormMapper', () => {
  const mapper = new GroupTypeormMapper(new GroupBuilder());

  it('hydrates the aggregate from a row', () => {
    expect(mapper.toAggregate(entity).toPrimitives()).toEqual({
      id: GROUP_ID,
      name: 'Home',
      createdBy: 'user_A',
      createdAt: CREATED,
      updatedAt: UPDATED,
    });
  });

  it('builds the read-side view model from a row', () => {
    const viewModel = mapper.toViewModel(entity);

    expect(viewModel.id).toBe(GROUP_ID);
    expect(viewModel.name).toBe('Home');
    expect(viewModel.createdBy).toBe('user_A');
    expect(viewModel.updatedAt).toEqual(UPDATED);
  });

  it('flattens an aggregate back into a row shape', () => {
    const aggregate = new GroupBuilder()
      .withId(GROUP_ID)
      .withName('Trip')
      .withCreatedBy('user_B')
      .withCreatedAt(CREATED)
      .withUpdatedAt(UPDATED)
      .build();

    expect(mapper.toEntity(aggregate)).toEqual({
      id: GROUP_ID,
      name: 'Trip',
      createdBy: 'user_B',
      createdAt: CREATED,
      updatedAt: UPDATED,
    });
  });
});
