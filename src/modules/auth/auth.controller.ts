import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { type Response } from 'express';
import { LoginDto } from './dto/login-dto';
import { ConfigService } from '@nestjs/config';
import { Auth } from '@/common/decorators/auth.decorator';

@Controller('auth')
export class AuthController {
  private readonly cookieMaxAge = 1000 * 60 * 60 * 24;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Res({
      passthrough: true,
    })
    res: Response,
  ) {
    const { result, token } = await this.authService.login(body);

    const isProd = this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('iceAuthentication', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: this.cookieMaxAge,
    });

    return result;
  }

  @Post('logout')
  @Auth()
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';

    res.clearCookie('iceAuthentication', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
    });

    return { message: 'Sesión cerrada' };
  }
}
