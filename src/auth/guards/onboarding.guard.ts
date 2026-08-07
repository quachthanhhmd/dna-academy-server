import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';

@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    const user = userId ? await this.usersService.findById(userId) : null;

    if (!user || !user.onboardingDone) {
      throw new ForbiddenException({
        code: 'ONBOARDING_REQUIRED',
      });
    }

    return true;
  }
}
