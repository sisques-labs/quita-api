import { IExpenseEventData } from '@contexts/expenses/domain/events/interfaces/expense-event-data.interface';
import { BaseEvent } from '@sisques-labs/nestjs-kit';

export class ExpenseDeletedEvent extends BaseEvent<IExpenseEventData> {}
