const mongoose = require('mongoose');

const connectDB = async () => {
    const uri = process.env.MONGO_URI;

    try {
        console.log('⏳ Connecting to MongoDB Cloud...');
        
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15000,
        });

        console.log(`✅ MongoDB Connected Successfully to Cluster!`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Failed: ${error.message}`);
        console.log(`👉 Please verify that 0.0.0.0/0 is set in MongoDB Atlas Network Access.`);
    }
};

module.exports = connectDB;