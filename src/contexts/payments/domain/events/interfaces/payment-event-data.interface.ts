import { PaymentPrimitives } from '@contexts/payments/domain/primitives/payment.primitives';
import { IBaseEventData } from '@sisques-labs/nestjs-kit';

export type IPaymentEventData = PaymentPrimitives & IBaseEventData;
