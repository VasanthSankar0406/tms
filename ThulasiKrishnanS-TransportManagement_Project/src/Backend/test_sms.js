require('dotenv').config({ path: './.env' });
const { sendSMS } = require('./utils/smsService');

async function testSMS() {
    console.log("Testing SMS with API Key:", process.env.FAST2SMS_API_KEY ? "Present" : "Missing");
    // Using a sample phone number for testing
    const testNumber = "9876543210";
    const message = "This is a test message from your Transport Management System.";

    console.log(`Attempting to send to ${testNumber}...`);
    try {
        const result = await sendSMS(testNumber, message);
        console.log("Result:", result);
    } catch (e) {
        console.error("Caught error:", e);
    }
}

testSMS();
