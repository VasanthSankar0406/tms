const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text, html) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Standard gmail service
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            text: text,
            html: html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return { success: true, message: 'Email sent successfully', messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, message: 'Failed to send email', error: error.message };
    }
};

module.exports = { sendEmail };
