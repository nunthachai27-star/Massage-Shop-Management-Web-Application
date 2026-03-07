import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle("Massage Shop API")
    .setDescription("API for Massage Shop Management")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
