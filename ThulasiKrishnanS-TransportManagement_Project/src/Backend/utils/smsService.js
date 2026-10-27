
const https = require('https');

const sendSMS = (to, message) => {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.FAST2SMS_API_KEY;

        if (!apiKey) {
            console.warn('FAST2SMS_API_KEY is missing in .env. Logging SMS to console instead.');
            console.log("==========================================");
            console.log("SENDING SMS TO:", to);
            console.log("MESSAGE:", message);
            console.log("==========================================");
            return resolve({ success: true, message: 'SMS logged to console (API Key missing)' });
        }

        const postData = JSON.stringify({
            "route": "q",
            "message": message,
            "language": "english",
            "flash": 0,
            "numbers": to
        });

        const options = {
            hostname: 'www.fast2sms.com',
            port: 443,
            path: '/dev/bulkV2',
            method: 'POST',
            headers: {
                "authorization": apiKey,
                "Content-Type": "application/json",
                "Content-Length": postData.length
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('Fast2SMS Raw Response:', data);
                try {
                    const parsedData = JSON.parse(data);
                    if (parsedData.return) {
                        resolve({ success: true, message: 'SMS sent successfully', data: parsedData });
                    } else {
                        console.error('Fast2SMS API Error - Parsed Data:', parsedData);
                        console.error('Fast2SMS API Error - Sent Data:', postData);
                        resolve({ success: false, message: 'Failed to send SMS via Fast2SMS', error: parsedData });
                    }
                } catch (e) {
                    console.error('Error parsing Fast2SMS response:', e);
                    resolve({ success: false, message: 'Invalid response from Fast2SMS' });
                }
            });
        });

        req.on('error', (e) => {
            console.error('Fast2SMS Request Error:', e);
            reject(e);
        });

        req.write(postData);
        req.end();
    });
};

module.exports = { sendSMS };
