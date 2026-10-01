import { IPaymentEventData } from '@contexts/payments/domain/events/interfaces/payment-event-data.interface';
import { BaseEvent } from '@sisques-labs/nestjs-kit';

export class PaymentDeletedEvent extends BaseEvent<IPaymentEventData> {}
