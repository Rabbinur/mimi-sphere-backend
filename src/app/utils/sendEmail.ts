import nodemailer from 'nodemailer';
import config from '../config';
import { createCircuitBreaker } from './circuitBreaker';
import logger from './logger';

const rawSendEmail = async (
  to: string,
  subject: string,
  text: string,
  html: string,
  attachments?: any[],
) => {
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: Number(config.smtp.port),
    secure: Number(config.smtp.port) === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  await transporter.sendMail({
    from: `Mimi Sphere <info@mimisphere.com>`,
    to,
    subject,
    text,
    html,
    attachments,
  });
};

export const emailCircuitBreaker = createCircuitBreaker(
  rawSendEmail,
  'SMTP Email Service',
  {
    timeout: 8000, // 8 seconds timeout
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  },
);

emailCircuitBreaker.fallback((to: string, _subject: any, _text: any, _html: any, _attachments: any, error?: Error) => {
  logger.warn(`Email sending circuit is OPEN. Could not deliver email to ${to}: ${error?.message || 'SMTP timeout'}`);
  return { success: false, circuitOpen: true };
});

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html: string,
  attachments?: any[],
) => {
  return await emailCircuitBreaker.fire(to, subject, text, html, attachments);
};
