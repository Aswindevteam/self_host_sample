import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

@Injectable()
export class NginxService {
  private readonly logger = new Logger(NginxService.name);
  private readonly sitesAvailableDir = '/etc/nginx/sites-available';
  private readonly sitesEnabledDir = '/etc/nginx/sites-enabled';
  private readonly localConfigDir = path.join(process.cwd(), 'nginx', 'conf.d');
  private useSystemDirs: boolean = false;

  constructor() {
    // Try to use system directories, fall back to local if no permission
    try {
      fs.mkdirSync(this.sitesAvailableDir, { recursive: true });
      fs.mkdirSync(this.sitesEnabledDir, { recursive: true });
      this.useSystemDirs = true;
      this.logger.log('Using system Nginx directories: /etc/nginx/sites-available and /etc/nginx/sites-enabled');
    } catch (err) {
      this.logger.warn(`Cannot access system Nginx directories: ${err.message}. Using local directory: ${this.localConfigDir}`);
      this.useSystemDirs = false;
      // Ensure local directory exists
      fs.mkdirSync(this.localConfigDir, { recursive: true });
    }
  }

  async configureDomain(projectId: string, domain: string, port: number): Promise<void> {
    if (!domain) return;

    const configContent = `server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://localhost:${port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
`;

    const configFileName = `${projectId}.conf`;

    if (this.useSystemDirs) {
      const availablePath = path.join(this.sitesAvailableDir, configFileName);
      const enabledPath = path.join(this.sitesEnabledDir, configFileName);

      try {
        // Write to sites-available
        fs.writeFileSync(availablePath, configContent);
        this.logger.log(`Generated Nginx configuration in sites-available: ${availablePath}`);

        // Create symlink in sites-enabled
        if (fs.existsSync(enabledPath)) {
          fs.unlinkSync(enabledPath);
        }
        fs.symlinkSync(availablePath, enabledPath);
        this.logger.log(`Created symlink in sites-enabled: ${enabledPath}`);

        // Reload Nginx
        exec('sudo nginx -s reload', (error) => {
          if (error) {
            this.logger.warn(`Could not reload Nginx: ${error.message}. Is Nginx running or requires sudo permission?`);
          } else {
            this.logger.log('Nginx configuration reloaded successfully!');
          }
        });
      } catch (err) {
        this.logger.error(`Failed to configure Nginx: ${err.message}`);
        throw new Error(`Failed to configure Nginx: ${err.message}`);
      }
    } else {
      // Use local directory
      const localPath = path.join(this.localConfigDir, configFileName);
      fs.writeFileSync(localPath, configContent);
      this.logger.log(`Generated Nginx configuration in local directory: ${localPath}`);
      this.logger.warn(`Note: To use this configuration, manually copy it to /etc/nginx/sites-enabled/ or configure Nginx to read from ${this.localConfigDir}`);
    }
  }

  async removeDomain(projectId: string): Promise<void> {
    const configFileName = `${projectId}.conf`;

    if (this.useSystemDirs) {
      const availablePath = path.join(this.sitesAvailableDir, configFileName);
      const enabledPath = path.join(this.sitesEnabledDir, configFileName);

      try {
        // Remove symlink from sites-enabled
        if (fs.existsSync(enabledPath)) {
          fs.unlinkSync(enabledPath);
          this.logger.log(`Removed symlink from sites-enabled: ${enabledPath}`);
        }

        // Remove config from sites-available
        if (fs.existsSync(availablePath)) {
          fs.unlinkSync(availablePath);
          this.logger.log(`Removed config from sites-available: ${availablePath}`);
        }

        // Reload Nginx
        exec('sudo nginx -s reload', (error) => {
          if (!error) {
            this.logger.log('Nginx config removed and reloaded.');
          } else {
            this.logger.warn(`Could not reload Nginx after removal: ${error.message}`);
          }
        });
      } catch (err) {
        this.logger.warn(`Could not remove Nginx config: ${err.message}`);
      }
    } else {
      // Use local directory
      const localPath = path.join(this.localConfigDir, configFileName);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        this.logger.log(`Removed Nginx configuration from local directory: ${localPath}`);
      }
    }
  }
}
