"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const chalk_1 = __importDefault(require("chalk"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
    }));
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    logger.log(chalk_1.default.bold.green('🚀 LaunchPad Service is fully operational! ') +
        chalk_1.default.gray('Listening on: ') +
        chalk_1.default.cyan.bold.underline(`http://localhost:${port}`));
}
bootstrap();
//# sourceMappingURL=main.js.map