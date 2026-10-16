// ==============================================================================
// YKB Clothing - Mailer Utility
// Supports Resend API, Brevo API, and SMTP (via nodemailer).
// Credentials are read exclusively from environment variables.
// ==============================================================================

async function sendEmail({ to, subject, text, html }) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const brevoApiKey = process.env.BREVO_API_KEY;
    const smtpHost = process.env.SMTP_HOST;

    const defaultFrom = process.env.RESEND_FROM || "YKB Clothing <onboarding@resend.dev>";

    // Provider 1: Resend HTTP API
    if (resendApiKey) {
        try {
            const from = process.env.RESEND_FROM || "YKB Clothing <onboarding@resend.dev>";
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${resendApiKey}`
                },
                body: JSON.stringify({ from, to: [to], subject, text, html })
            });

            const data = await response.json();
            if (!response.ok) {
                console.error("❌ Resend API delivery error:", data?.message || response.statusText);
                return { sent: false, error: data?.message || "Delivery failed" };
            }
            return { sent: true, id: data?.id };
        } catch (error) {
            console.error("❌ Resend email dispatch failed:", error.message);
            return { sent: false, error: error.message };
        }
    }

    // Provider 2: Brevo (Sendinblue) HTTP API
    if (brevoApiKey) {
        try {
            const senderName = "YKB Clothing";
            const senderEmail = process.env.BREVO_FROM || "noreply@ykbclothing.com";
            const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "api-key": brevoApiKey
                },
                body: JSON.stringify({
                    sender: { name: senderName, email: senderEmail },
                    to: [{ email: to }],
                    subject,
                    textContent: text,
                    htmlContent: html
                })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                console.error("❌ Brevo API delivery error:", data?.message || response.statusText);
                return { sent: false, error: data?.message || "Delivery failed" };
            }
            return { sent: true };
        } catch (error) {
            console.error("❌ Brevo email dispatch failed:", error.message);
            return { sent: false, error: error.message };
        }
    }

    // Provider 3: SMTP via nodemailer
    if (smtpHost && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
            const nodemailer = require("nodemailer");
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: Number(process.env.SMTP_PORT) === 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            const from = process.env.SMTP_FROM || defaultFrom;
            const info = await transporter.sendMail({ from, to, subject, text, html });
            return { sent: true, id: info.messageId };
        } catch (error) {
            console.error("❌ SMTP delivery failed:", error.message);
            return { sent: false, error: error.message };
        }
    }

    // Unconfigured state: explicitly logged without printing credentials
    console.warn("⚠️ [Mailer] No email provider configured (missing RESEND_API_KEY, BREVO_API_KEY, or SMTP_*). Password reset email was not dispatched.");
    return { sent: false, reason: "NOT_CONFIGURED" };
}

async function sendPasswordResetEmail({ to, resetUrl }) {
    const subject = "Reset your YKB Clothing password";
    const text = `Hello,\n\nWe received a request to reset your YKB Clothing password.\n\nPlease visit the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 15 minutes.\nIf you did not request this reset, you can safely ignore this email.\n\n— The YKB Clothing Team`;
    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; color: #0e1414;">
            <div style="border-bottom: 2px solid #088178; padding-bottom: 16px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #088178; letter-spacing: -0.5px;">YKB CLOTHING</h2>
            </div>
            <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
            <p style="font-size: 15px; line-height: 1.5;">We received a request to reset the password for your YKB Clothing account.</p>
            <div style="margin: 28px 0; text-align: center;">
                <a href="${resetUrl}" style="background-color: #088178; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 50px; font-weight: 600; display: inline-block;">Reset Password</a>
            </div>
            <p style="font-size: 13px; color: #666; line-height: 1.5;">Or copy and paste this link into your browser:<br><a href="${resetUrl}" style="color: #088178; word-break: break-all;">${resetUrl}</a></p>
            <p style="font-size: 13px; color: #888; margin-top: 24px;">This link will expire in <strong>15 minutes</strong>. If you did not make this request, your account is safe and no further action is needed.</p>
        </div>
    `;

    return sendEmail({ to, subject, text, html });
}

module.exports = {
    sendEmail,
    sendPasswordResetEmail
};

