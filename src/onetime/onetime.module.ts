import { Module } from '@nestjs/common';
import { OnetimeService } from './onetime.service';
import { OnetimeResolver } from './onetime.resolver';

@Module({
  providers: [OnetimeResolver, OnetimeService],
})
export class OnetimeModule {}
