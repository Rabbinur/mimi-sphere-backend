import { MailService } from '../config/mailService';

/**
 * Professional Email Templates for Mimi Sphere
 * Styled to match the Invoice PDF design.
 */

const primaryColor = '#333333';
const accentColor = '#0056b3';
const secondaryColor = '#555555';
const lightGrey = '#eeeeee';

const headerTemplate = `
  <table width="100%" cellpadding="0" cellspacing="0" style="
    background-color: #ffffff;
    padding: 20px 20px;
    border-bottom: 2px solid ${primaryColor};
    font-family: Helvetica, Arial, sans-serif;
  ">
    <tr>
      <td align="right" valign="middle" style="
        color: ${primaryColor};
        font-size: 11px;
        line-height: 1.5;
      ">
        <img 
          src="https://www.shoppingcart.bd/logo.png" 
          alt="Mimi Sphere" 
          style="height: 30px; margin-bottom: 2px;"
        /><br/>
        info@shoppingcart.bd<br/>
        +8801722597565
      </td>
    </tr>
  </table>
`;

const footerTemplate = `
  <table width="100%" cellpadding="0" cellspacing="0" style="
    background-color: #ffffff;
    padding: 20px 20px;
    border-top: 1px solid ${lightGrey};
    font-family: Helvetica, Arial, sans-serif;
  ">
    <tr>
      <!-- Left: Contact -->
      <td width="50%" align="left" valign="top">
        <strong style="
          color: ${secondaryColor};
          font-size: 10px;
          text-transform: uppercase;
          display: block;
          margin-bottom: 6px;
        ">
          Contact Information
        </strong>
        <span style="
          color: ${primaryColor};
          font-size: 12px;
          line-height: 1.6;
        ">
          Phone: +8801722597565<br/>
          Email: info@shoppingcart.bd<br/>
          Website: www.shoppingcart.bd
        </span>
      </td>
      <!-- Right: Social + Thank You -->
      <td width="50%" align="right" valign="top">
        <!-- Follow Us -->
        <strong style="
          color: ${secondaryColor};
          font-size: 10px;
          text-transform: uppercase;
          display: block;
          margin-bottom: 6px;
        ">
          Follow Us
        </strong>
        <!-- Icons -->
       <table cellpadding="0" cellspacing="0" align="right">
  <tr>
    <!-- Facebook -->
    <td style="padding-left:6px;">
      <a href="https://www.facebook.com/shoppingcartbd.official" target="_blank">
        <img 
          src="https://www.shoppingcart.bd/icons/facebook.png" 
          width="18" 
          style="display:block; border:0;"
        />
      </a>
    </td>
    <!-- Instagram -->
    <td style="padding-left:6px;">
      <a href="https://www.instagram.com/shoppingcart.bd/" target="_blank">
        <img 
          src="https://www.shoppingcart.bd/icons/instagram.png" 
          width="18" 
          style="display:block; border:0;"
        />
      </a>
    </td>
    <!-- WhatsApp -->
    <td style="padding-left:6px;">
      <a href="https://wa.link/fabxoj" target="_blank">
        <img 
          src="https://www.shoppingcart.bd/icons/whatsapp.png" 
          width="18" 
          style="display:block; border:0;"
        />
      </a>
    </td>
  </tr>
</table>
        <!-- spacing fix -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td height="12"></td></tr>
        </table>
        <!-- Thank You -->
        <table cellpadding="0" cellspacing="0" align="right">
          <tr>
            <td align="right">
              <strong style="
                color: ${primaryColor};
                font-size: 12px;
              ">
              Thank You for choosing
              </strong><br/>
              <span style="
                color: ${accentColor};
                font-size: 12px;
                font-weight: bold;
              ">
                Mimi Sphere
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

const getOTPTemplate = (
  otp: string | number,
  name: string = 'Valued Customer',
  title_text: string = 'Account Verification',
  body_text: string = 'Use the code below to verify your account and complete your registration:',
) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; }
        .content { padding: 30px 20px; color: #333; line-height: 1.6; }
        .otp-box { background: #f4f4f4; border-radius: 8px; padding: 25px; text-align: center; margin: 25px 0; border: 1px dashed ${accentColor}; }
        .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 5px; color: ${accentColor}; margin: 0; }
        @media only screen and (max-width: 480px) {
          .container { margin: 0 !important; width: 100% !important; border-radius: 0 !important; }
          .content { padding: 20px 15px !important; }
          .otp-code { font-size: 28px !important; letter-spacing: 4px !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${headerTemplate}
        <div class="content">
          <h2 style="margin: 0 0 15px 0; color: ${primaryColor};">${title_text}</h2>
          <p style="margin:0; font-size: 16px;">Hi <strong>${name}</strong>,</p>
          <p style="margin:15px 0; font-size: 15px;">${body_text}</p>
          <div class="otp-box">
            <h1 class="otp-code">${otp}</h1>
          </div>
          <p style="margin:0; font-size: 13px; color: #666; text-align: center;">This code will expire in 10 minutes for security reasons. If you did not request this code, please ignore this email.</p>
        </div>
        ${footerTemplate}
      </div>
    </body>
    </html>
  `;
};

const getPasswordChangeTemplate = (name: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fa; margin:0; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #eee; }
        .content { padding: 30px 20px; color: #333; }
        .warning { background: #fff5f5; border-left: 4px solid #f56565; padding: 20px; margin-top: 25px; font-size: 14px; color: #c53030; }
        @media only screen and (max-width: 480px) {
          .container { margin: 0 !important; width: 100% !important; border-radius: 0 !important; }
          .content { padding: 20px 15px !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${headerTemplate}
        <div class="content">
          <h2 style="margin: 0 0 15px 0; color: ${primaryColor};">Security Update</h2>
          <p style="margin:0; font-size: 16px;">Hi <strong>${name}</strong>,</p>
          <p style="margin:15px 0; font-size: 15px;">This is a courtesy notification to let you know that the password for your <strong>Mimi Sphere</strong> account was recently changed.</p>
          <div class="warning">
            <strong>Not you?</strong> If you did not make this change, please contact our support team immediately at <strong>+8801722 597565</strong> to secure your account.
          </div>
        </div>
        ${footerTemplate}
      </div>
    </body>
    </html>
  `;
};

const getWelcomeTemplate = (name: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fa; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; text-align: center; overflow: hidden; border: 1px solid #eee; }
        .header-bg { background: ${accentColor}; color: #fff; padding: 40px 20px; }
        .content { padding: 30px 20px; color: #333; }
        .btn { display: inline-block; padding: 14px 35px; background: ${accentColor}; color: #fff !important; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; font-size: 16px; }
        @media only screen and (max-width: 480px) {
          .container { margin: 0 !important; width: 100% !important; border-radius: 0 !important; }
          .header-bg { padding: 30px 15px !important; }
          .content { padding: 20px 15px !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header-bg">
          <h1 style="margin:0; font-size: 28px;">Welcome to the Family!</h1>
        </div>
        <div class="content">
          <p style="font-size: 18px; margin:0;">Hi <strong>${name}</strong>,</p>
          <p style="margin:20px 0; font-size: 16px; color: #555;">We're thrilled to have you join <strong>Mimi Sphere</strong>. You're now part of a community that values quality, authenticity, and the best deals in Bangladesh.</p>
          <p style="font-size: 15px; color: #666;">Ready to explore? Click the button below to start your shopping journey.</p>
          <a href="https://shoppingcart.bd" class="btn">Start Shopping</a>
        </div>
        ${footerTemplate}
      </div>
    </body>
    </html>
  `;
};

class Service {
  async sendAccountVerificationOtp(email: string, otp: number | string, name: string = 'Valued Customer') {
    const title = 'Account Verification';
    const htmlContent = getOTPTemplate(otp, name, title, 'Use the code below to verify your account and complete your registration:');

    await MailService.sendRaw({
      htmlContent,
      subject: title,
      to: email,
    });
  }

  async sendForgetPasswordEmail(email: string, otp: number | string, name: string = 'Valued Customer') {
    const title = 'Reset Your Password';
    const htmlContent = getOTPTemplate(otp, name, title, "We received a request to reset the password for your account. Please use the following One-Time Password (OTP) to proceed:");

    await MailService.sendRaw({
      htmlContent,
      subject: title,
      to: email,
    });
  }

  async sendWelcomeEmail(email: string, name: string) {
    const title = 'Welcome to Mimi Sphere';
    const htmlContent = getWelcomeTemplate(name);

    await MailService.sendRaw({
      htmlContent,
      subject: title,
      to: email,
    });
  }

  async sendPasswordChangeNotification(email: string, name: string) {
    const title = 'Security Alert: Password Changed';
    const htmlContent = getPasswordChangeTemplate(name);

    await MailService.sendRaw({
      htmlContent,
      subject: title,
      to: email,
    });
  }
}

export const UserMailService = new Service();
