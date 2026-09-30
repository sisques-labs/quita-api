import { GroupBuilder } from '@contexts/groups/domain/builders/group.builder';
import { GroupCreatedEvent } from '@contexts/groups/domain/events/group-created/group-created.event';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';

describe('GroupAggregate', () => {
  it('exposes its state as primitives', () => {
    const group = new GroupBuilder()
      .withId(GROUP_ID)
      .withName('Home')
      .withCreatedBy('user_owner')
      .withCreatedAt(new Date('2026-01-01T10:00:00Z'))
      .build();

    expect(group.toPrimitives()).toEqual({
      id: GROUP_ID,
      name: 'Home',
      createdBy: 'user_owner',
      createdAt: new Date('2026-01-01T10:00:00Z'),
      updatedAt: new Date('2026-01-01T10:00:00Z'),
    });
  });

  it('does not emit events while being hydrated', () => {
    const group = new GroupBuilder()
      .withId(GROUP_ID)
      .withName('Home')
      .withCreatedBy('user_owner')
      .build();

    expect(group.getUncommittedEvents()).toHaveLength(0);
  });

  it('emits GroupCreatedEvent for the group on create()', () => {
    const group = new GroupBuilder()
      .withId(GROUP_ID)
      .withName('Home')
      .withCreatedBy('user_owner')
      .build();

    group.create();

    const events = group.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(GroupCreatedEvent);
    expect(events[0]).toMatchObject({
      aggregateRootId: GROUP_ID,
      aggregateRootType: 'GroupAggregate',
    });
  });

  it('rejects a group without a name', () => {
    expect(() =>
      new GroupBuilder().withId(GROUP_ID).withCreatedBy('user_owner').build(),
    ).toThrow();
  });

  it('rejects a group without a creator', () => {
    expect(() =>
      new GroupBuilder().withId(GROUP_ID).withName('Home').build(),
    ).toThrow();
  });
});
