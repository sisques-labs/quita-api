import { GroupInvitationCodeBuilder } from '@contexts/group-invitation-codes/domain/builders/group-invitation-code.builder';
import { GroupInvitationCodeEntity } from '@contexts/group-invitation-codes/infrastructure/persistence/typeorm/entities/group-invitation-code.entity';
import { GroupInvitationCodeTypeormMapper } from '@contexts/group-invitation-codes/infrastructure/persistence/typeorm/mappers/group-invitation-code-typeorm.mapper';

const ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const CREATED = new Date('2026-01-01T09:00:00Z');
const UPDATED = new Date('2026-01-02T09:00:00Z');
const REVOKED = new Date('2026-01-03T09:00:00Z');

const row = (revokedAt: Date | null) =>
  Object.assign(new GroupInvitationCodeEntity(), {
    id: ID,
    groupId: GROUP_ID,
    code: '7KQ2M9XZ',
    createdBy: 'user_A',
    revokedAt,
    createdAt: CREATED,
    updatedAt: UPDATED,
  });

describe('GroupInvitationCodeTypeormMapper', () => {
  const mapper = new GroupInvitationCodeTypeormMapper();

  it('hydrates an active aggregate from a row', () => {
    const aggregate = mapper.toAggregate(row(null));

    expect(aggregate.isActive()).toBe(true);
    expect(aggregate.toPrimitives()).toEqual({
      id: ID,
      groupId: GROUP_ID,
      code: '7KQ2M9XZ',
      createdBy: 'user_A',
      revokedAt: null,
      createdAt: CREATED,
      updatedAt: UPDATED,
    });
  });

  it('hydrates a revoked aggregate and view model from a row', () => {
    expect(mapper.toAggregate(row(REVOKED)).isActive()).toBe(false);

    const viewModel = mapper.toViewModel(row(REVOKED));
    expect(viewModel.groupId).toBe(GROUP_ID);
    expect(viewModel.code).toBe('7KQ2M9XZ');
    expect(viewModel.revokedAt).toEqual(REVOKED);
  });

  it('flattens an aggregate back into a row shape', () => {
    const aggregate = new GroupInvitationCodeBuilder()
      .withId(ID)
      .withGroupId(GROUP_ID)
      .withCode('ABCD2345')
      .withCreatedBy('user_B')
      .withCreatedAt(CREATED)
      .withUpdatedAt(UPDATED)
      .build();

    expect(mapper.toEntity(aggregate)).toEqual({
      id: ID,
      groupId: GROUP_ID,
      code: 'ABCD2345',
      createdBy: 'user_B',
      revokedAt: null,
      createdAt: CREATED,
      updatedAt: UPDATED,
    });
  });
});
