import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { InteractionsModule } from './interactions/interactions.module';
import { MetricsModule } from './metrics/metrics.module';
import { AgentsModule } from './agents/agents.module';

@Module({
  imports: [PrismaModule, InteractionsModule, MetricsModule, AgentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
