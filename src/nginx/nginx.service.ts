import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

@Injectable()
export class NginxService {
  private readonly logger = new Logger(NginxService.name);
  private readonly localConfigDir = path.join(process.cwd(), 'nginx', 'conf.d');

  constructor() {
    // Ensure local config directory exists in workspace
    fs.mkdirSync(this.localConfigDir, { recursive: true });
  }

  async configureDomain(projectId: string, domain: string, port: number): Promise<void> {
    if (!domain) return;

    const configContent = `server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;

    const configFileName = `${projectId}.conf`;
    const localPath = path.join(this.localConfigDir, configFileName);

    // 1. Write config to workspace nginx/conf.d/
    fs.writeFileSync(localPath, configContent);
    this.logger.log(`Generated Nginx configuration in workspace: ${localPath}`);

    // 2. Try copying it to system-wide Nginx config folder (if we have permissions)
    const systemConfigDir = '/etc/nginx/sites-enabled';
    if (fs.existsSync(systemConfigDir)) {
      const systemPath = path.join(systemConfigDir, configFileName);
      try {
        fs.writeFileSync(systemPath, configContent);
        this.logger.log(`Successfully wrote Nginx configuration to system: ${systemPath}`);
        
        // 3. Try to reload Nginx
        exec('sudo nginx -s reload', (error) => {
          if (error) {
            this.logger.warn(`Could not reload Nginx: ${error.message}. Is Nginx running or requires sudo permission?`);
          } else {
            this.logger.log('Nginx configuration reloaded successfully!');
          }
        });
      } catch (err) {
        this.logger.warn(`Could not write directly to system Nginx dir: ${err.message}. Please configure Nginx to read configs from: ${this.localConfigDir}`);
      }
    } else {
      this.logger.log(`System Nginx directory not found at /etc/nginx/sites-enabled. Nginx configs will be saved in workspace: ${this.localConfigDir}`);
    }
  }

  async removeDomain(projectId: string): Promise<void> {
    const configFileName = `${projectId}.conf`;
    const localPath = path.join(this.localConfigDir, configFileName);

    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }

    const systemConfigDir = '/etc/nginx/sites-enabled';
    const systemPath = path.join(systemConfigDir, configFileName);
    if (fs.existsSync(systemPath)) {
      try {
        fs.unlinkSync(systemPath);
        exec('sudo nginx -s reload', (error) => {
          if (!error) this.logger.log('Nginx config removed and reloaded.');
        });
      } catch (err) {
        this.logger.warn(`Could not delete system Nginx config: ${err.message}`);
      }
    }
  }
}
