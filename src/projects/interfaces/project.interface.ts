export interface IProject {
  id: string;
  name: string;
  description?: string;
  gitUrl?: string;
  dockerImage?: string;
  branch?: string;
  port: number;
  envVariables: Record<string, string>;
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}
