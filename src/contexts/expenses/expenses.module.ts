import { CreateExpenseHandler } from '@contexts/expenses/application/commands/create-expense/create-expense.handler';
import { DeleteExpenseHandler } from '@contexts/expenses/application/commands/delete-expense/delete-expense.handler';
import { EditExpenseHandler } from '@contexts/expenses/application/commands/edit-expense/edit-expense.handler';
import { GROUP_MEMBERS_PORT } from '@contexts/expenses/application/ports/group-members.port';
import { ExpensesFindActiveByGroupHandler } from '@contexts/expenses/application/queries/expenses-find-active-by-group/expenses-find-active-by-group.handler';
import { ExpensesFindByCriteriaHandler } from '@contexts/expenses/application/queries/expenses-find-by-criteria/expenses-find-by-criteria.handler';
import { AssertRequesterIsGroupMemberService } from '@contexts/expenses/application/services/read/assert-requester-is-group-member.service';
import { AssertExpenseExistsService } from '@contexts/expenses/application/services/write/assert-expense-exists.service';
import { EXPENSE_READ_REPOSITORY } from '@contexts/expenses/domain/repositories/read/expense-read.repository';
import { EXPENSE_WRITE_REPOSITORY } from '@contexts/expenses/domain/repositories/write/expense-write.repository';
import { GroupMembersBusAdapter } from '@contexts/expenses/infrastructure/adapters/group-members-bus.adapter';
import { ExpenseEntity } from '@contexts/expenses/infrastructure/persistence/typeorm/entities/expense.entity';
import { ExpenseTypeormMapper } from '@contexts/expenses/infrastructure/persistence/typeorm/mappers/expense-typeorm.mapper';
import { ExpenseTypeormReadRepository } from '@contexts/expenses/infrastructure/persistence/typeorm/repositories/expense-typeorm-read.repository';
import { ExpenseTypeormWriteRepository } from '@contexts/expenses/infrastructure/persistence/typeorm/repositories/expense-typeorm-write.repository';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

const COMMAND_HANDLERS = [
  CreateExpenseHandler,
  EditExpenseHandler,
  DeleteExpenseHandler,
];

const QUERY_HANDLERS = [
  ExpensesFindByCriteriaHandler,
  ExpensesFindActiveByGroupHandler,
];

const APPLICATION_SERVICES = [
  AssertRequesterIsGroupMemberService,
  AssertExpenseExistsService,
];

const INFRASTRUCTURE_ENTITIES = [ExpenseEntity];

const INFRASTRUCTURE_MAPPERS = [ExpenseTypeormMapper];

const INFRASTRUCTURE_REPOSITORIES = [
  {
    provide: EXPENSE_WRITE_REPOSITORY,
    useClass: ExpenseTypeormWriteRepository,
  },
  {
    provide: EXPENSE_READ_REPOSITORY,
    useClass: ExpenseTypeormReadRepository,
  },
];

const INFRASTRUCTURE_ADAPTERS = [
  { provide: GROUP_MEMBERS_PORT, useClass: GroupMembersBusAdapter },
];

/**
 * Reaches group-members only through the bus (see `GroupMembersBusAdapter`),
 * so it does not import that module: both are registered in `ContextsModule`.
 * The `CLOCK` token comes from the global core `ClockModule`.
 */
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature(INFRASTRUCTURE_ENTITIES)],
  providers: [
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    ...APPLICATION_SERVICES,
    ...INFRASTRUCTURE_MAPPERS,
    ...INFRASTRUCTURE_REPOSITORIES,
    ...INFRASTRUCTURE_ADAPTERS,
  ],
})
export class ExpensesModule {}
