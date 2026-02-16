import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    async validate(payload: any) {
        // Fetch user with business data
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: {
                businesses: true,
            },
        });

        return {
            userId: payload.sub,
            email: payload.email,
            business: user?.businesses[0],
            businessId: user?.businesses[0]?.id,
        };
    }
}
