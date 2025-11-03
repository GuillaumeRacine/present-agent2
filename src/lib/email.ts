/**
 * Email Service
 * Sends magic link emails using nodemailer
 */

import nodemailer from 'nodemailer';
import { logger } from './logger.js';

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// Create transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    if (!EMAIL_USER || !EMAIL_PASS) {
      logger.warn('Email credentials not configured. Magic links will be logged instead.');
      // Create test account for development
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'test@ethereal.email',
          pass: 'test',
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_PORT === 465,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS,
        },
      });
    }
  }
  return transporter;
}

/**
 * Send magic link email
 */
export async function sendMagicLinkEmail(
  email: string,
  token: string
): Promise<{ success: boolean; messageId?: string; previewUrl?: string }> {
  try {
    const magicLink = `${FRONTEND_URL}/auth/verify?token=${token}`;

    // In development mode without email credentials, just log the magic link
    if (!EMAIL_USER || !EMAIL_PASS) {
      logger.info('Magic link email (development mode - logging only):', {
        to: email,
        magicLink,
      });

      // Return success with the magic link as preview URL for development
      return {
        success: true,
        messageId: `dev-${Date.now()}`,
        previewUrl: magicLink,
      };
    }

    // Production mode - actually send email
    const mailOptions = {
      from: EMAIL_FROM,
      to: email,
      subject: 'Sign in to Present Agent',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 20px 0; }
              .content { background: #f5f5f5; padding: 30px; border-radius: 8px; }
              .button { display: inline-block; padding: 12px 30px; background: #000; color: #fff; text-decoration: none; border-radius: 4px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Present Agent</h1>
              </div>
              <div class="content">
                <h2>Sign in to your account</h2>
                <p>Click the button below to sign in to Present Agent. This link will expire in 15 minutes.</p>
                <div style="text-align: center;">
                  <a href="${magicLink}" class="button">Sign In</a>
                </div>
                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                  Or copy and paste this link into your browser:<br>
                  <span style="word-break: break-all;">${magicLink}</span>
                </p>
                <p style="margin-top: 20px; font-size: 12px; color: #999;">
                  If you didn't request this email, you can safely ignore it.
                </p>
              </div>
              <div class="footer">
                <p>Present Agent - AI-Powered Gift Recommendations</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Sign in to Present Agent

Click this link to sign in (expires in 15 minutes):
${magicLink}

If you didn't request this email, you can safely ignore it.

Present Agent - AI-Powered Gift Recommendations
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);

    logger.info('Magic link email sent:', {
      to: email,
      messageId: info.messageId,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error('Failed to send magic link email:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false };
  }
}
