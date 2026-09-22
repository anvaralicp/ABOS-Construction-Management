import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; sessionId?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive or disabled.');
    }
    
    // Passport attaches this return value to req.user
    return { id: user.id, email: user.email, sessionId: payload.sessionId };
  }
}