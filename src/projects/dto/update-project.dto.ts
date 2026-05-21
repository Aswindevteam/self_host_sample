import { IsString, IsOptional, IsNumber, Min, Max, IsObject } from 'class-validator';

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  gitUrl?: string;

  @IsString()
  @IsOptional()
  dockerImage?: string;

  @IsString()
  @IsOptional()
  distPath?: string;

  @IsString()
  @IsOptional()
  branch?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsObject()
  @IsOptional()
  envVariables?: Record<string, string>;
}
