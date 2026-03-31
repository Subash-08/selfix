import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: `"Selfix" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Verify your Selfix account",
    html: `<p>Hi ${name},</p>
           <p>Click below to verify your account:</p>
           <a href="${url}">${url}</a>
           <p>Link expires in 24 hours.</p>`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: `"Selfix" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Reset your Selfix password",
    html: `<p>Click below to reset your password:</p>
           <a href="${url}">${url}</a>
           <p>Expires in 1 hour.</p>`,
  });
}
