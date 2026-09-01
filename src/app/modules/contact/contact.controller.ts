import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ContactService } from './contact.service';

const submitContact = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactService.submitContactForm(req.body);

  res.status(201).json({
    success: true,
    message: 'Message sent successfully!',
    data: result,
  });
});

export const ContactController = {
  submitContact,
};
