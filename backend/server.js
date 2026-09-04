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
app.use(
    helmet({
        contentSecurityPolicy: false // Allows external CDN scripts like Tailwind and Chart.js
    })
);
app.use(morgan('dev'));

// Serve Static Frontend Files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/estimates', require('./routes/estimateRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Fallback: Serve Web App for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Web App running on: http://localhost:${PORT}`);
    console.log(`==================================================`);
    await connectDB();
});