const axios = require('axios');
const WORKER_URL = 'https://rag-worker-dev-mcc5aevj6a-uc.a.run.app';

async function trigger() {
    console.log(`Despertando al worker en: ${WORKER_URL}`);
    try {
        await axios.post(WORKER_URL, {}, { timeout: 3000 });
        console.log('Worker invocado.');
    } catch (e) {
        console.log('Worker invocado (catch).');
    }
}
trigger();
