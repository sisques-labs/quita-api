import { IExpenseEventData } from '@contexts/expenses/domain/events/interfaces/expense-event-data.interface';
import { BaseEvent } from '@sisques-labs/nestjs-kit';

export class ExpenseUpdatedEvent extends BaseEvent<IExpenseEventData> {}
