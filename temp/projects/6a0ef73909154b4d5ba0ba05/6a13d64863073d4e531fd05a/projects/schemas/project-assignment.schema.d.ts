import { Document, Schema as MongooseSchema, Types } from 'mongoose';
export type ProjectAssignmentDocument = ProjectAssignment & Document;
export declare class ProjectAssignment {
    projectId: Types.ObjectId;
    userId: Types.ObjectId;
    canView: boolean;
    canEdit: boolean;
    canDeploy: boolean;
}
export declare const ProjectAssignmentSchema: MongooseSchema<ProjectAssignment, import("mongoose").Model<ProjectAssignment, any, any, any, any, any, ProjectAssignment>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProjectAssignment, Document<unknown, {}, ProjectAssignment, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ProjectAssignment & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    projectId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, ProjectAssignment, Document<unknown, {}, ProjectAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ProjectAssignment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, ProjectAssignment, Document<unknown, {}, ProjectAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ProjectAssignment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    canView?: import("mongoose").SchemaDefinitionProperty<boolean, ProjectAssignment, Document<unknown, {}, ProjectAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ProjectAssignment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    canEdit?: import("mongoose").SchemaDefinitionProperty<boolean, ProjectAssignment, Document<unknown, {}, ProjectAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ProjectAssignment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    canDeploy?: import("mongoose").SchemaDefinitionProperty<boolean, ProjectAssignment, Document<unknown, {}, ProjectAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ProjectAssignment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, ProjectAssignment>;
