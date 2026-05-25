import { Document, Schema as MongooseSchema, Types } from 'mongoose';
export type DeploymentDocument = Deployment & Document;
export declare class Deployment {
    projectId: Types.ObjectId;
    status: string;
    containerId: string;
    logs: string[];
    imageName: string;
}
export declare const DeploymentSchema: MongooseSchema<Deployment, import("mongoose").Model<Deployment, any, any, any, any, any, Deployment>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Deployment, Document<unknown, {}, Deployment, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Deployment & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    projectId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Deployment, Document<unknown, {}, Deployment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Deployment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<string, Deployment, Document<unknown, {}, Deployment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Deployment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    containerId?: import("mongoose").SchemaDefinitionProperty<string, Deployment, Document<unknown, {}, Deployment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Deployment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    logs?: import("mongoose").SchemaDefinitionProperty<string[], Deployment, Document<unknown, {}, Deployment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Deployment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    imageName?: import("mongoose").SchemaDefinitionProperty<string, Deployment, Document<unknown, {}, Deployment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Deployment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Deployment>;
