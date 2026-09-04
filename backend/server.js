const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/estimates', require('./routes/estimateRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Cost Estimation Platform API is Running!',
        status: 'online',
        timestamp: new Date()
    });
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start Server FIRST
app.listen(PORT, async () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Server running on: http://localhost:${PORT}`);
    console.log(`==================================================`);
    
    // Connect to DB in background
    await connectDB();
});