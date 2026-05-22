import 'dotenv/config';
import { ServerApplication } from './app/server-application.js';
import { AppConfig } from './config/app-config.js';
import { MongoDatabase } from './database/mongo-database.js';
import { ConnectionManager } from './database/connection-manager.js';

const config = new AppConfig();
const database = new MongoDatabase(config);
const connectionManager = new ConnectionManager(config);
const server = new ServerApplication(config, connectionManager);

try {
  await database.connect();
} catch (error) {
  console.error('Error conectando a MongoDB:', error);
  process.exit(1);
}

server.build();
server.listen();
