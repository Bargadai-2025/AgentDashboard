const https = require('https');
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'models');

// Create models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

const models = [
    // Tiny Face Detector
    'tiny_face_detector_model-shard1',
    'tiny_face_detector_model-shard2',
    'tiny_face_detector_model-weights_manifest.json',

    // Face Landmark 68
    'face_landmark_68_model-shard1',
    'face_landmark_68_model-shard2',
    'face_landmark_68_model-weights_manifest.json',

    // Face Recognition
    'face_recognition_model-shard1',
    'face_recognition_model-shard2',
    'face_recognition_model-weights_manifest.json'
];

function downloadFile(url, filename) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(modelsDir, filename);
        const file = fs.createWriteStream(filePath);

        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log(`✅ Downloaded ${filename}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => {}); // Delete the file on error
            reject(err);
        });
    });
}

async function downloadAllModels() {
    console.log('🚀 Starting face-api.js models download...');

    for (const model of models) {
        const url = `https://github.com/justadudewhohacks/face-api.js/raw/master/weights/${model}`;
        try {
            await downloadFile(url, model);
        } catch (error) {
            console.error(`❌ Failed to download ${model}:`, error.message);
            // Try alternative source
            const altUrl = `https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/${model}`;
            try {
                console.log(`🔄 Trying alternative source for ${model}...`);
                await downloadFile(altUrl, model);
            } catch (altError) {
                console.error(`❌ Alternative download also failed for ${model}`);
            }
        }
    }

    console.log('✅ All models downloaded successfully!');
}

downloadAllModels().catch(console.error);