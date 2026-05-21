import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class AssignProjectDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsOptional()
  @IsBoolean()
  canView?: boolean;

  @IsOptional()
  @IsBoolean()
  canEdit?: boolean;

  @IsOptional()
  @IsBoolean()
  canDeploy?: boolean;
}
