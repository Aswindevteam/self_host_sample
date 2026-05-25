"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const deployments_service_1 = require("./deployments.service");
const deployments_controller_1 = require("./deployments.controller");
const deployment_schema_1 = require("./schemas/deployment.schema");
const projects_module_1 = require("../projects/projects.module");
const nginx_module_1 = require("../nginx/nginx.module");
let DeploymentsModule = class DeploymentsModule {
};
exports.DeploymentsModule = DeploymentsModule;
exports.DeploymentsModule = DeploymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: deployment_schema_1.Deployment.name, schema: deployment_schema_1.DeploymentSchema }]),
            projects_module_1.ProjectsModule,
            nginx_module_1.NginxModule,
        ],
        controllers: [deployments_controller_1.DeploymentsController],
        providers: [deployments_service_1.DeploymentsService],
        exports: [deployments_service_1.DeploymentsService],
    })
], DeploymentsModule);
//# sourceMappingURL=deployments.module.js.map