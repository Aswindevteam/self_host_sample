import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateOrgAdminDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  organizationName: string;
}
