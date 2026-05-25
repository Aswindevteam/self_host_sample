"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerModule = void 0;
const common_1 = require("@nestjs/common");
const docker_service_1 = require("./docker.service");
const docker_controller_1 = require("./docker.controller");
const projects_module_1 = require("../projects/projects.module");
let DockerModule = class DockerModule {
};
exports.DockerModule = DockerModule;
exports.DockerModule = DockerModule = __decorate([
    (0, common_1.Module)({
        imports: [projects_module_1.ProjectsModule],
        controllers: [docker_controller_1.DockerController],
        providers: [docker_service_1.DockerService],
        exports: [docker_service_1.DockerService],
    })
], DockerModule);
//# sourceMappingURL=docker.module.js.map