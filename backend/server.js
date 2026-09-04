const express = require('express');
const path = require('path');
const fs = require('fs');
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
        contentSecurityPolicy: false // Allows CDN scripts (Tailwind, FontAwesome, Chart.js)
    })
);
app.use(morgan('dev'));

// Dynamic Public Path Finder (Works on Local, Render, Docker, AWS)
const potentialPublicPaths = [
    path.join(__dirname, 'public'),
    path.join(__dirname, '..', 'public'),
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'backend', 'public')
];

let publicDir = potentialPublicPaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || path.join(__dirname, 'public');

console.log(`📁 Serving frontend from: ${publicDir}`);
app.use(express.static(publicDir));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/estimates', require('./routes/estimateRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Fallback: Serve Web App for any other route
app.get('*', (req, res) => {
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(200).send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: white; min-height: 100vh;">
                <h1>🚀 CloudCost Pro API is Online</h1>
                <p>Frontend assets are syncing. Please refresh in 30 seconds.</p>
            </div>
        `);
    }
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