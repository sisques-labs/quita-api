import { ExpenseAggregate } from '@contexts/expenses/domain/aggregates/expense.aggregate';
import { IBaseWriteRepository } from '@sisques-labs/nestjs-kit';

export const EXPENSE_WRITE_REPOSITORY = Symbol('EXPENSE_WRITE_REPOSITORY');

export type IExpenseWriteRepository = IBaseWriteRepository<ExpenseAggregate>;
