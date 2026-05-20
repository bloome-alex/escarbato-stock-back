import 'dotenv/config';
import { ServerApplication } from './app/server-application.js';
import { AppConfig } from './config/app-config.js';
import { MongoDatabase } from './database/mongo-database.js';
import { AuthService } from './services/auth.service.js';

const config = new AppConfig();
const database = new MongoDatabase(config);
const server = new ServerApplication(config);

try {
  await database.connect();
  await new AuthService(config).initializeUsers();
} catch (error) {
  console.error('Error conectando a MongoDB:', error);
  process.exit(1);
}

server.build();
server.listen();
