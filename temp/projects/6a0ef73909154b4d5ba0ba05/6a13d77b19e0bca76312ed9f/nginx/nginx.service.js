"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NginxService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NginxService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
let NginxService = NginxService_1 = class NginxService {
    logger = new common_1.Logger(NginxService_1.name);
    sitesAvailableDir = '/etc/nginx/sites-available';
    sitesEnabledDir = '/etc/nginx/sites-enabled';
    localConfigDir = path.join(process.cwd(), 'nginx', 'conf.d');
    useSystemDirs = false;
    constructor() {
        try {
            fs.mkdirSync(this.sitesAvailableDir, { recursive: true });
            fs.mkdirSync(this.sitesEnabledDir, { recursive: true });
            this.useSystemDirs = true;
            this.logger.log('Using system Nginx directories: /etc/nginx/sites-available and /etc/nginx/sites-enabled');
        }
        catch (err) {
            this.logger.warn(`Cannot access system Nginx directories: ${err.message}. Using local directory: ${this.localConfigDir}`);
            this.useSystemDirs = false;
            fs.mkdirSync(this.localConfigDir, { recursive: true });
        }
    }
    async configureDomain(projectId, domain, port) {
        if (!domain)
            return;
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
                fs.writeFileSync(availablePath, configContent);
                this.logger.log(`Generated Nginx configuration in sites-available: ${availablePath}`);
                if (fs.existsSync(enabledPath)) {
                    fs.unlinkSync(enabledPath);
                }
                fs.symlinkSync(availablePath, enabledPath);
                this.logger.log(`Created symlink in sites-enabled: ${enabledPath}`);
                (0, child_process_1.exec)('sudo nginx -s reload', (error) => {
                    if (error) {
                        this.logger.warn(`Could not reload Nginx: ${error.message}. Is Nginx running or requires sudo permission?`);
                    }
                    else {
                        this.logger.log('Nginx configuration reloaded successfully!');
                    }
                });
            }
            catch (err) {
                this.logger.error(`Failed to configure Nginx: ${err.message}`);
                throw new Error(`Failed to configure Nginx: ${err.message}`);
            }
        }
        else {
            const localPath = path.join(this.localConfigDir, configFileName);
            fs.writeFileSync(localPath, configContent);
            this.logger.log(`Generated Nginx configuration in local directory: ${localPath}`);
            this.logger.warn(`Note: To use this configuration, manually copy it to /etc/nginx/sites-enabled/ or configure Nginx to read from ${this.localConfigDir}`);
        }
    }
    async removeDomain(projectId) {
        const configFileName = `${projectId}.conf`;
        if (this.useSystemDirs) {
            const availablePath = path.join(this.sitesAvailableDir, configFileName);
            const enabledPath = path.join(this.sitesEnabledDir, configFileName);
            try {
                if (fs.existsSync(enabledPath)) {
                    fs.unlinkSync(enabledPath);
                    this.logger.log(`Removed symlink from sites-enabled: ${enabledPath}`);
                }
                if (fs.existsSync(availablePath)) {
                    fs.unlinkSync(availablePath);
                    this.logger.log(`Removed config from sites-available: ${availablePath}`);
                }
                (0, child_process_1.exec)('sudo nginx -s reload', (error) => {
                    if (!error) {
                        this.logger.log('Nginx config removed and reloaded.');
                    }
                    else {
                        this.logger.warn(`Could not reload Nginx after removal: ${error.message}`);
                    }
                });
            }
            catch (err) {
                this.logger.warn(`Could not remove Nginx config: ${err.message}`);
            }
        }
        else {
            const localPath = path.join(this.localConfigDir, configFileName);
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
                this.logger.log(`Removed Nginx configuration from local directory: ${localPath}`);
            }
        }
    }
};
exports.NginxService = NginxService;
exports.NginxService = NginxService = NginxService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], NginxService);
//# sourceMappingURL=nginx.service.js.map