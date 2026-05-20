import mongoose from 'mongoose';

export class MongoDatabase {
  constructor(config) {
    this.config = config;
  }

  async connect() {
    const options = this.config.mongoDbName ? { dbName: this.config.mongoDbName } : undefined;
    await mongoose.connect(this.config.mongoUri, options);
  }
}
