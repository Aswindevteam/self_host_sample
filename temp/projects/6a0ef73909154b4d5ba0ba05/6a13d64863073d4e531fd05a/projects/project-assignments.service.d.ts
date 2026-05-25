import { Model } from 'mongoose';
import { ProjectAssignmentDocument } from './schemas/project-assignment.schema';
export declare class ProjectAssignmentsService {
    private projectAssignmentModel;
    constructor(projectAssignmentModel: Model<ProjectAssignmentDocument>);
    assignToUser(projectId: string, userId: string, canView?: boolean, canEdit?: boolean, canDeploy?: boolean): Promise<ProjectAssignmentDocument>;
    findByUser(userId: string): Promise<ProjectAssignmentDocument[]>;
    findByProject(projectId: string): Promise<ProjectAssignmentDocument[]>;
    remove(projectId: string, userId: string): Promise<void>;
    hasAccess(projectId: string, userId: string): Promise<boolean>;
}
