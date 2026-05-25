"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectAssignmentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const project_assignment_schema_1 = require("./schemas/project-assignment.schema");
let ProjectAssignmentsService = class ProjectAssignmentsService {
    projectAssignmentModel;
    constructor(projectAssignmentModel) {
        this.projectAssignmentModel = projectAssignmentModel;
    }
    async assignToUser(projectId, userId, canView = true, canEdit = false, canDeploy = false) {
        const existing = await this.projectAssignmentModel.findOne({ projectId, userId }).exec();
        if (existing) {
            existing.canView = canView;
            existing.canEdit = canEdit;
            existing.canDeploy = canDeploy;
            return existing.save();
        }
        const created = new this.projectAssignmentModel({
            projectId: new mongoose_2.Types.ObjectId(projectId),
            userId: new mongoose_2.Types.ObjectId(userId),
            canView,
            canEdit,
            canDeploy,
        });
        return created.save();
    }
    async findByUser(userId) {
        return this.projectAssignmentModel.find({ userId: new mongoose_2.Types.ObjectId(userId) }).exec();
    }
    async findByProject(projectId) {
        return this.projectAssignmentModel.find({ projectId: new mongoose_2.Types.ObjectId(projectId) }).exec();
    }
    async remove(projectId, userId) {
        await this.projectAssignmentModel.deleteOne({ projectId, userId }).exec();
    }
    async hasAccess(projectId, userId) {
        const assignment = await this.projectAssignmentModel.findOne({
            projectId: new mongoose_2.Types.ObjectId(projectId),
            userId: new mongoose_2.Types.ObjectId(userId),
        }).exec();
        return !!assignment && assignment.canView;
    }
};
exports.ProjectAssignmentsService = ProjectAssignmentsService;
exports.ProjectAssignmentsService = ProjectAssignmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(project_assignment_schema_1.ProjectAssignment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ProjectAssignmentsService);
//# sourceMappingURL=project-assignments.service.js.map