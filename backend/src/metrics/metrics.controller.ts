import { Controller, Get, Query } from '@nestjs/common';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import { MetricsResult, MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  getMetrics(@Query() query: MetricsQueryDto): Promise<MetricsResult> {
    return this.metricsService.getMetrics(query);
  }
}
