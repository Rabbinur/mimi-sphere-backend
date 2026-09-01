import nodemailer from 'nodemailer';
import config from '../config';

export const sendEmail = async (
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
    from: `Shopping Cart BD <info@shoppingcart.bd>`,
    to,
    subject,
    text,
    html,
    attachments,
  });
};
