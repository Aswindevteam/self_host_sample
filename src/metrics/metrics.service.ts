import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApiMetric, ApiMetricDocument } from './schemas/api-metric.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';

@Injectable()
export class MetricsService {
  constructor(
    @InjectModel(ApiMetric.name) private apiMetricModel: Model<ApiMetricDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>
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
      .populate('organizationId', 'name')
      .sort({ count: -1 })
      .limit(limit)
      .exec();
  }

  async getDeployedAppsUsage(organizationId?: string) {
    // 1. Find all projects matching the organization (or all if admin global)
    const filter: any = {};
    if (organizationId) {
      // Find users in this org
      // For simplicity, we assume projects have an 'owner' field which we can lookup,
      // or we can just fetch all projects and filter if project schema has orgId.
      // Wait, project schema has 'owner' which is a User. User has organizationId.
      // To keep it simple, we will fetch all projects, populate owner, and filter by orgId.
      const projects = await this.projectModel.find().populate('owner').exec();
      const orgProjects = projects.filter(p => {
         const owner = p.owner as any;
         return owner && owner.organizationId && owner.organizationId.toString() === organizationId;
      });
      return this.aggregateLogFiles(orgProjects.map(p => p._id.toString()));
    } else {
      const projects = await this.projectModel.find().exec();
      return this.aggregateLogFiles(projects.map(p => p._id.toString()));
    }
  }

  private aggregateLogFiles(projectIds: string[]) {
    const fs = require('fs');
    const path = require('path');
    const metricsMap = new Map<string, { endpoint: string, method: string, count: number }>();

    for (const projectId of projectIds) {
      const logPath = path.join(process.cwd(), 'nginx', 'logs', `${projectId}.log`);
      if (!fs.existsSync(logPath)) continue;

      try {
        const content = fs.readFileSync(logPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim() !== '');
        
        for (const line of lines) {
          const match = line.match(/"([A-Z]+)\s+([^\s]+)\s+HTTP/);
          if (match && match.length === 3) {
            const method = match[1];
            let endpoint = match[2];
            endpoint = endpoint.split('?')[0];
            if (endpoint.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i)) {
               endpoint = '/static-assets';
            }
            
            const key = `${method}::${endpoint}`;
            if (!metricsMap.has(key)) {
              metricsMap.set(key, { endpoint, method, count: 0 });
            }
            metricsMap.get(key)!.count++;
          }
        }
      } catch (err) {
        console.error(`Error reading log file for project ${projectId}:`, err);
      }
    }

    return Array.from(metricsMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  }
}
