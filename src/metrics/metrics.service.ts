import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiMetric, ApiMetricDocument } from './schemas/api-metric.schema';

@Injectable()
export class MetricsService {
  constructor(
    @InjectModel(ApiMetric.name) private apiMetricModel: Model<ApiMetricDocument>
  ) {}

  async trackApiUsage(endpoint: string, method: string, organizationId?: string) {
    const filter: any = { endpoint, method };
    if (organizationId) {
      filter.organizationId = organizationId;
    } else {
      filter.organizationId = { $exists: false }; // Track unauthenticated/global requests separately
    }

    await this.apiMetricModel.updateOne(
      filter,
      { $inc: { count: 1 } },
      { upsert: true }
    ).exec();
  }

  async getTopApis(organizationId?: string, limit: number = 10) {
    const filter: any = {};
    if (organizationId) {
      filter.organizationId = organizationId;
    }
    
    return this.apiMetricModel
      .find(filter)
      .sort({ count: -1 })
      .limit(limit)
      .exec();
  }
}
