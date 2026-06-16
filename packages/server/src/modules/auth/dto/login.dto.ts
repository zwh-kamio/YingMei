import { IsString, IsNotEmpty, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Length(11, 11, { message: '请输入正确的手机号' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 32, { message: '密码长度为6-32位' })
  password: string;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Length(11, 11, { message: '请输入正确的手机号' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 32, { message: '密码长度为6-32位' })
  password: string;

  @IsString()
  @Length(0, 64)
  nickname?: string;
}
