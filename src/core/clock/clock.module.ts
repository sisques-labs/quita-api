import { CLOCK } from '@core/clock/domain/clock.port';
import { SystemClock } from '@core/clock/infrastructure/system-clock';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    {
      provide: CLOCK,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new SystemClock(config.getOrThrow<string>('app.timezone')),
    },
  ],
  exports: [CLOCK],
})
export class ClockModule {}
