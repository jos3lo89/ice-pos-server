// src/modules/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Asumiendo que usas config service
import { Request } from 'express';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // EXTRAE EL TOKEN DE LA COOKIE, NO DEL HEADER
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.Authentication; // Nombre de la cookie
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'secretKey', // Usa variables de entorno
    });
  }

  async validate(payload: JwtPayload) {
    // Lo que retornes aquí se inyecta en req.user
    return { id: payload.sub, email: payload.email, roles: payload.roles };
  }
}
