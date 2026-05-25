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
      // Check if we actually have write access to these directories
      fs.accessSync(this.sitesAvailableDir, fs.constants.W_OK);
      fs.accessSync(this.sitesEnabledDir, fs.constants.W_OK);
      
      this.useSystemDirs = true;
      this.logger.log('Using system Nginx directories: /etc/nginx/sites-available and /etc/nginx/sites-enabled');
    } catch (err) {
      this.logger.warn(`Cannot write to system Nginx directories: ${err.message}. Using local directory: ${this.localConfigDir}`);
      this.useSystemDirs = false;
      // Ensure local directory exists
      fs.mkdirSync(this.localConfigDir, { recursive: true });
    }
  }

  async configureDomain(projectId: string, domain: string, port: number, customConfig?: string): Promise<void> {
    if (!domain) return;

    const rawConfigContent = customConfig ? customConfig : `# ==============================================================================
# Enterprise-Grade Nginx Configuration Template
# Designed for Angular Frontend + .NET Backend with SignalR
# ==============================================================================

# 1. Load Balancing & Upstream Servers
upstream backend_api_${projectId} {
    server localhost:${port};
}

server {
    # 2. Server Configuration
    listen 80;
    server_name ${domain};
    
    # Force HTTPS redirect (requires SSL)
    # return 301 https://$host$request_uri;

    # 3. Security Headers
    server_tokens off;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # 4. File Upload Limits
    client_max_body_size 50M;

    # 5. Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript image/svg+xml;

    # 6. Static Hosting & Caching (Angular)
    location ~* \\.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg)$ {
        expires 6M;
        access_log off;
        add_header Cache-Control "public, max-age=15552000, immutable";
        proxy_pass http://backend_api_${projectId};
    }

    # 7. Reverse Proxy (Frontend & Default)
    location / {
        proxy_pass http://backend_api_${projectId};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # 8. .NET API
    location /api/ {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        expires off;
        
        proxy_pass http://backend_api_${projectId}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 9. SignalR / WebSockets
    location /hub/ {
        proxy_pass http://backend_api_${projectId}/hub/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }
}
`;

    const logPath = path.join(process.cwd(), 'nginx', 'logs', `${projectId}.log`);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    
    // Inject access_log directive into the server block
    let configContent = rawConfigContent;
    if (!configContent.includes('access_log')) {
      configContent = configContent.replace('server {', `server {\n    access_log ${logPath};\n`);
    }

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
