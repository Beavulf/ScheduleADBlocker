import { Module } from '@nestjs/common';
import { OtdelService } from './otdel.service';
import { OtdelResolver } from './otdel.resolver';

@Module({
  providers: [OtdelResolver, OtdelService],
})
export class OtdelModule {}
