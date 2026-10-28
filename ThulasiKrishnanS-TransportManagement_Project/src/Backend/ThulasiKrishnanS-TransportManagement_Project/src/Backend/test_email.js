require('dotenv').config({ path: './.env' });
const { sendEmail } = require('./utils/emailService');

async function testEmail() {
    console.log("Testing NodeMailer with EMAIL_USER:", process.env.EMAIL_USER);
    // Use the admin email as the recipient for the test
    const testToEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    console.log(`Attempting to send test email to ${testToEmail}...`);

    // Test leave submission email
    console.log("Testing Leave Submission Email...");
    try {
        const result1 = await sendEmail(
            testToEmail,
            "Leave Request Submitted",
            "Hello John Doe,\n\nYour leave request for 2026-04-10 has been submitted successfully.\n\nReason: Personal\nStatus: Pending\n\nRegards,\nTransport Management Team",
            "<p>Hello <strong>John Doe</strong>,</p><p>Your leave request for <strong>2026-04-10</strong> has been submitted successfully.</p><p>Reason: Personal</p><p>Status: <strong>Pending</strong></p><p>Regards,<br>Transport Management Team</p>"
        );
        console.log("Leave Submission Email Result:", result1);
    } catch (e) {
        console.error("Leave Submission Email Error:", e);
    }

    // Test leave approval email
    console.log("Testing Leave Approval Email...");
    try {
        const result2 = await sendEmail(
            testToEmail,
            "Leave Request Approved",
            "Hello John Doe,\n\nYour leave request for 4/10/2026 has been approved.\n\nReason: Personal\n\nRegards,\nTransport Management Team",
            "<p>Hello <strong>John Doe</strong>,</p><p>Your leave request for <strong>4/10/2026</strong> has been <strong>approved</strong>.</p><p>Reason: Personal</p><p>Regards,<br>Transport Management Team</p>"
        );
        console.log("Leave Approval Email Result:", result2);
    } catch (e) {
        console.error("Leave Approval Email Error:", e);
    }

    console.log("Email testing completed.");
}

testEmail();
