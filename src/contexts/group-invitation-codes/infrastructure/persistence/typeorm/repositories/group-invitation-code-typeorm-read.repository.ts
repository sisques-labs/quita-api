import { GroupInvitationCodeReadRepository } from '@contexts/group-invitation-codes/domain/repositories/read/group-invitation-code-read.repository';
import { GroupInvitationCodeViewModel } from '@contexts/group-invitation-codes/domain/view-models/group-invitation-code.view-model';
import { GroupInvitationCodeEntity } from '@contexts/group-invitation-codes/infrastructure/persistence/typeorm/entities/group-invitation-code.entity';
import { GroupInvitationCodeTypeormMapper } from '@contexts/group-invitation-codes/infrastructure/persistence/typeorm/mappers/group-invitation-code-typeorm.mapper';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';

@Injectable()
export class GroupInvitationCodeTypeormReadRepository implements GroupInvitationCodeReadRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mapper: GroupInvitationCodeTypeormMapper,
  ) {}

  async findActiveByCode(
    code: string,
  ): Promise<GroupInvitationCodeViewModel | null> {
    const row = await this.dataSource
      .getRepository(GroupInvitationCodeEntity)
      .findOneBy({ code, revokedAt: IsNull() });
    return row ? this.mapper.toViewModel(row) : null;
  }
}
