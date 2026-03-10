import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());

  // CORS — restrict to known origins
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",");
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger — only in development
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Massage Shop API")
      .setDescription("API for Massage Shop Management")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
