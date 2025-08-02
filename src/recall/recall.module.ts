import { Module } from '@nestjs/common';
import { RecallService } from './recall.service';
import { RecallResolver } from './recall.resolver';

@Module({
  providers: [RecallResolver, RecallService],
})
export class RecallModule {}
