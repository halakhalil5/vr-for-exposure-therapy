/**
 * MongoDB Database Configuration
 * 
 * Handles database connection and provides connection utility functions
 */

const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * @param {string} uri - MongoDB connection URI
 * @returns {Promise} Mongoose connection promise
 */
const connectDB = async (uri) => {
  try {
    const conn = await mongoose.connect(uri, {
      // These options are now default in Mongoose 6+
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    throw error;
  }
};

/**
 * Disconnect from MongoDB
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
};

module.exports = { connectDB, disconnectDB };
