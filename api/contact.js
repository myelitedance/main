import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, message } = req.body

  console.log('API Request Received:', { name, email, message })
  console.log('From:', process.env.EMAIL_FROM)
  console.log('To:', process.env.EMAIL_TO)

  const { data, error } = await resend.emails.send({
    from: `Elite Dance <${process.env.EMAIL_FROM}>`,
    to: [process.env.EMAIL_TO],
    subject: 'New Registration Inquiry',
    reply_to: [email],
    html: `
      <h2>New Inquiry</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong><br>${message}</p>
    `,
  })

  if (error) {
    console.error('Resend Email Error:', error)
    return res.status(400).json({ success: false, error })
  }

  console.log('Resend Success:', data)
  return res.status(200).json({ success: true, data })
}