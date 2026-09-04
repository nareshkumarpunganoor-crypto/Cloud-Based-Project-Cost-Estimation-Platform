const mongoose = require('mongoose');
const https = require('https');

// Helper function to resolve SRV records over HTTPS (bypasses ISP/DNS blocking)
function resolveSrvOverHttps(hostname) {
    return new Promise((resolve, reject) => {
        const url = `https://dns.google/resolve?name=_mongodb._tcp.${hostname}&type=SRV`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.Answer && json.Answer.length > 0) {
                        const hosts = json.Answer.map(ans => {
                            // Format: "priority weight port target"
                            const parts = ans.data.split(' ');
                            const port = parts[2];
                            const host = parts[3].replace(/\.$/, '');
                            return `${host}:${port}`;
                        });
                        resolve(hosts.join(','));
                    } else {
                        reject(new Error('No SRV answers returned from DNS'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

const connectDB = async () => {
    let uri = process.env.MONGO_URI;

    try {
        console.log('⏳ Connecting to MongoDB Cloud...');

        // If it's an SRV connection string, resolve directly via HTTPS to bypass ISP blockers
        if (uri && uri.startsWith('mongodb+srv://')) {
            try {
                const match = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?$/);
                if (match) {
                    const [, user, pass, hostname, dbPath = '/cost_estimation_db', query = ''] = match;
                    const resolvedHosts = await resolveSrvOverHttps(hostname);

                    // Build standard direct connection string
                    uri = `mongodb://${user}:${pass}@${resolvedHosts}${dbPath}?ssl=true&authSource=admin&retryWrites=true&w=majority`;
                    console.log('📡 Successfully bypassed DNS/ISP restriction using secure DNS-over-HTTPS!');
                }
            } catch (dnsErr) {
                console.log('ℹ️ Standard DNS fallback...');
            }
        }

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15000
        });

        console.log(`✅ MongoDB Connected Successfully to Cluster!`);
    } catch (error) {
        console.log(`❌ MongoDB Connection Failed: ${error.message}`);
        console.log(`👉 Please verify that 0.0.0.0/0 is set in MongoDB Atlas Network Access.`);
    }
};

module.exports = connectDB;