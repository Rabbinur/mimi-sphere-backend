import { sendEmail } from '../../utils/sendEmail';
import { Contact } from './contact.model';

const submitContactForm = async (payload: any) => {
  const result = await Contact.create(payload);

  // Send Email Notification to Admin
  const adminEmail = 'slsuyel@gmail.com';
  const subject = `New Contact Inquiry: ${payload.subject}`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #4f46e5;">New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${payload.name}</p>
      <p><strong>Email:</strong> ${payload.email}</p>
      <p><strong>Subject:</strong> ${payload.subject}</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p><strong>Message:</strong></p>
      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
        ${payload.message}
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        Sent from Your Store Contact Page
      </p>
    </div>
  `;

  sendEmail(adminEmail, subject, `New Inquiry from ${payload.name}`, html).catch(
    console.error,
  );

  return result;
};

export const ContactService = {
  submitContactForm,
};
