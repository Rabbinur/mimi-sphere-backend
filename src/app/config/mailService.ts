import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import config from './index';
import { MailPayload } from '../email/mail.interface';

class Service {
  private async sendEmail(data: MailPayload) {
    const { subject, from, to, htmlContent, cc, bcc } = data;
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: Number(config.smtp.port),
      secure: config.smtp.secure as boolean,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      logger: true,
      debug: true,
    });

    const mailOptions: SMTPTransport.Options = {
      from: `Shopping Cart BD <${from || config.smtp.user}>`,
      to,
      subject,
      html: htmlContent,
      attachments: data.attachments,
    };


    if (bcc) mailOptions.bcc = bcc;
    if (cc) mailOptions.cc = cc;

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[EmailService] ✅ Email sent: ${info.messageId}`);
      return info;
    } catch (error: any) {
      console.error(`[EmailService] ❌ Failed: ${error.message}`);
      throw error;
    }
  }

  private wrapper(content: string, title: string) {
    return `
      <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px; color: #333;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          
          <div style="background-color: #6a1b9a; padding: 20px; text-align: center;">
            <h2 style="margin: 0; color: #fff;">🛍️ Shopping Cart BD</h2>
            <p style="color: #fff; margin-top: 5px;">${title}</p>
          </div>
  
          <div style="padding: 20px;">
            ${content}
          </div>
  
          <div style="background-color: #f1f1f1; text-align: center; padding: 12px; font-size: 12px; color: #777;">
            <p>&copy; ${new Date().getFullYear()} Shopping Cart BD — 
              <a href="${
                config.frontend_url
              }" style="color: #6a1b9a; text-decoration: none;">Explore More</a>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  public async send(title: string, data: MailPayload) {
    const { subject, htmlContent, to, from, cc, bcc } = data;
    const content = this.wrapper(htmlContent, title);
    return await this.sendEmail({
      htmlContent: content,
      subject,
      to,
      bcc,
      cc,
      from,
    });
  }

  public async sendRaw(data: MailPayload) {
    return await this.sendEmail(data);
  }
}

export const MailService = new Service();
