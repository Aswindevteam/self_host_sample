import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import { ProjectAssignmentsService } from './project-assignments.service';
export declare class ProjectsService implements OnModuleInit {
    private projectModel;
    private orgsService;
    private usersService;
    private projectAssignmentsService;
    constructor(projectModel: Model<ProjectDocument>, orgsService: OrganizationsService, usersService: UsersService, projectAssignmentsService: ProjectAssignmentsService);
    onModuleInit(): Promise<void>;
    create(projectData: CreateProjectDto, user: any): Promise<ProjectDocument>;
    findAll(user: any): Promise<ProjectDocument[]>;
    findOne(id: string, user: any): Promise<ProjectDocument>;
    update(id: string, updateData: UpdateProjectDto, user: any): Promise<ProjectDocument>;
    remove(id: string, user: any): Promise<any>;
    assignToUser(assignProjectDto: AssignProjectDto, user: any): Promise<any>;
    getUserAssignments(userId: string, user: any): Promise<any[]>;
    removeAssignment(assignmentId: string, user: any): Promise<any>;
    updateAssignment(assignmentId: string, permissions: {
        canView: boolean;
        canEdit: boolean;
        canDeploy: boolean;
    }, user: any): Promise<any>;
    extractDistUpload(files: Express.Multer.File[]): Promise<{
        distPath: string;
    }>;
}
