import mongoose from 'mongoose';

export class MongoDatabase {
  constructor(config) {
    this.config = config;
  }

  async connect() {
    const options = { dbName: this.config.mongoDbAdminName };
    await mongoose.connect(this.config.mongoUri, options);
  }
}
