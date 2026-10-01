import { IExpensePrimitives } from '@contexts/expenses/domain/primitives/expense.primitives';
import { IBaseEventData } from '@sisques-labs/nestjs-kit';

export type IExpenseEventData = IExpensePrimitives & IBaseEventData;
