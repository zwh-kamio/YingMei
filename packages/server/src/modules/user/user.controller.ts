import { Controller, Get, Put, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('info')
  getProfile(@CurrentUser('id') userId: number) {
    return this.userService.getProfile(userId);
  }

  @Put('profile')
  updateProfile(
    @CurrentUser('id') userId: number,
    @Body() body: { nickname?: string; avatarUrl?: string },
  ) {
    return this.userService.updateProfile(userId, body);
  }
}
