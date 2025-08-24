import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create data directory if it doesn't exist
const dataDir = join(__dirname, '../../../data');
try {
  mkdirSync(dataDir, { recursive: true });
} catch (error) {
  // Directory already exists or permission error
}

// Database configuration
const dbPath = process.env.DATABASE_PATH || join(dataDir, 'mpesa_development.db');

// Create Sequelize instance
export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  
  // Connection pool configuration
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  
  // SQLite specific options
  dialectOptions: {
    // Enable foreign key constraints
    foreignKeys: true
  },
  
  // Define global model options
  define: {
    // Add timestamps to all models by default
    timestamps: true,
    
    // Use camelCase for automatically added attributes
    underscored: false,
    
    // Don't delete database entries but set the newly added attribute deletedAt
    paranoid: false,
    
    // Don't use camelcase for automatically added attributes but underscore style
    // So updatedAt will be updated_at
    underscoredAll: false,
    
    // Disable the modification of table names; By default, sequelize will automatically
    // transform all passed model names (first parameter of define) into plural.
    freezeTableName: true
  },
  
  // Retry configuration
  retry: {
    match: [
      /SQLITE_BUSY/,
      /SQLITE_LOCKED/
    ],
    max: 3
  }
});

// Test the connection
export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
}

// Export sequelize instance as default
export default sequelize;
