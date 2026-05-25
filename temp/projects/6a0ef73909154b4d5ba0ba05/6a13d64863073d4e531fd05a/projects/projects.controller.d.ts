import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
export declare class ProjectsController {
    private projectsService;
    constructor(projectsService: ProjectsService);
    create(createProjectDto: CreateProjectDto, req: any): Promise<import("./schemas/project.schema").ProjectDocument>;
    uploadDist(files: Express.Multer.File[]): Promise<{
        distPath: string;
    }>;
    findAll(req: any): Promise<import("./schemas/project.schema").ProjectDocument[]>;
    findOne(id: string, req: any): Promise<import("./schemas/project.schema").ProjectDocument>;
    update(id: string, updateProjectDto: UpdateProjectDto, req: any): Promise<import("./schemas/project.schema").ProjectDocument>;
    remove(id: string, req: any): Promise<any>;
    assignToUser(assignProjectDto: AssignProjectDto, req: any): Promise<any>;
    getUserAssignments(userId: string, req: any): Promise<any[]>;
    removeAssignment(assignmentId: string, req: any): Promise<any>;
    updateAssignment(assignmentId: string, canView: boolean, canEdit: boolean, canDeploy: boolean, req: any): Promise<any>;
}
