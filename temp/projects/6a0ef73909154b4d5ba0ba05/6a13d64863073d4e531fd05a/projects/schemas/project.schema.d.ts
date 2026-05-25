import { Document, Schema as MongooseSchema, Types } from 'mongoose';
export type ProjectDocument = Project & Document;
export declare class Project {
    name: string;
    gitUrl?: string;
    dockerImage?: string;
    distPath?: string;
    branch?: string;
    port: number;
    domain?: string;
    env: Map<string, string>;
    owner: Types.ObjectId;
}
export declare const ProjectSchema: MongooseSchema<Project, import("mongoose").Model<Project, any, any, any, any, any, Project>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Project, Document<unknown, {}, Project, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    gitUrl?: import("mongoose").SchemaDefinitionProperty<string | undefined, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    dockerImage?: import("mongoose").SchemaDefinitionProperty<string | undefined, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    distPath?: import("mongoose").SchemaDefinitionProperty<string | undefined, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    branch?: import("mongoose").SchemaDefinitionProperty<string | undefined, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    port?: import("mongoose").SchemaDefinitionProperty<number, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    domain?: import("mongoose").SchemaDefinitionProperty<string | undefined, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    env?: import("mongoose").SchemaDefinitionProperty<Map<string, string>, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    owner?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Project>;
