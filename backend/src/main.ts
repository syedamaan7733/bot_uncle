import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

function buildCorsOrigins(): string[] | boolean {
  const explicit = process.env.ALLOWED_ORIGINS?.trim();
  if (explicit === '*') {
    return true;
  }
  const fromList = explicit
    ? explicit.split(',').map((o) => o.trim()).filter(Boolean)
    : [];
  const single = process.env.FRONTEND_URL?.trim();
  const devDefaults = ['http://localhost:5173', 'http://localhost:5174'];
  const isProd = process.env.NODE_ENV === 'production';

  if (fromList.length > 0) {
    return isProd ? fromList : [...new Set([...devDefaults, ...fromList])];
  }
  if (single) {
    return isProd ? [single] : [...new Set([...devDefaults, single])];
  }
  return devDefaults;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.enableCors({
    origin: buildCorsOrigins(),
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}
bootstrap();
