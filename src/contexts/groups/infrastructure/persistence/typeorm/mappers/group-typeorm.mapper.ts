import { GroupAggregate } from '@contexts/groups/domain/aggregates/group.aggregate';
import { GroupBuilder } from '@contexts/groups/domain/builders/group.builder';
import { GroupViewModel } from '@contexts/groups/domain/view-models/group.view-model';
import { GroupEntity } from '@contexts/groups/infrastructure/persistence/typeorm/entities/group.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GroupTypeormMapper {
  constructor(private readonly groupBuilder: GroupBuilder) {}

  toAggregate(entity: GroupEntity): GroupAggregate {
    return this.toBuilder(entity).build();
  }

  toViewModel(entity: GroupEntity): GroupViewModel {
    return this.toBuilder(entity).buildViewModel();
  }

  toEntity(aggregate: GroupAggregate): GroupEntity {
    const primitives = aggregate.toPrimitives();
    return Object.assign(new GroupEntity(), {
      id: primitives.id,
      name: primitives.name,
      createdBy: primitives.createdBy,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    });
  }

  private toBuilder(entity: GroupEntity): GroupBuilder {
    return this.groupBuilder
      .withId(entity.id)
      .withName(entity.name)
      .withCreatedBy(entity.createdBy)
      .withCreatedAt(entity.createdAt)
      .withUpdatedAt(entity.updatedAt);
  }
}
