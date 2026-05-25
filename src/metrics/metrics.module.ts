import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { ApiMetric, ApiMetricSchema } from './schemas/api-metric.schema';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ApiTrackingInterceptor } from './api-tracking.interceptor';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ApiMetric.name, schema: ApiMetricSchema }])
  ],
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiTrackingInterceptor,
    }
  ],
  controllers: [MetricsController]
})
export class MetricsModule {}
