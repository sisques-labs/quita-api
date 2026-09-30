import { GroupReadRepository } from '@contexts/groups/domain/repositories/read/group-read.repository';
import { GroupViewModel } from '@contexts/groups/domain/view-models/group.view-model';
import { GroupEntity } from '@contexts/groups/infrastructure/persistence/typeorm/entities/group.entity';
import { GroupTypeormMapper } from '@contexts/groups/infrastructure/persistence/typeorm/mappers/group-typeorm.mapper';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';

@Injectable()
export class GroupTypeormReadRepository implements GroupReadRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mapper: GroupTypeormMapper,
  ) {}

  async findById(id: string): Promise<GroupViewModel | null> {
    const row = await this.dataSource
      .getRepository(GroupEntity)
      .findOneBy({ id });
    return row ? this.mapper.toViewModel(row) : null;
  }

  async findByIds(ids: string[]): Promise<GroupViewModel[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.dataSource.getRepository(GroupEntity).find({
      where: { id: In(ids) },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => this.mapper.toViewModel(row));
  }
}
