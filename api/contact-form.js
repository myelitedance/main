// pages/api/contact-form.js

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { parentName, phone, email, dancerInfo, interest, message } = req.body

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: 'Potential Customer Wants More Information!',
      reply_to: email,
      html: `
        <h2>New Contact Inquiry</h2>
        <p><strong>Parent/Guardian Name:</strong> ${parentName}</p>
        <p><strong>Phone Number:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Dancer Info:</strong> ${dancerInfo}</p>
        <p><strong>Interested In:</strong> ${interest}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, data })
  } catch (err) {
    console.error('Server error:', err)
    return res.status(500).json({ error: err.message })
  }
}