import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, message } = req.body

  const { data, error } = await resend.emails.send({
    from: 'Elite Dance <jason@myelitedance.com>', // formatted "name <email>"
    to: ['frontdesk@myelitedance.com'],
    subject: 'New Registration Inquiry',
    reply_to: [email], // array is safer format
    html: `
      <h2>New Inquiry</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong><br>${message}</p>
    `,
  })

  if (error) {
    console.error('Resend error:', error)
    return res.status(400).json(error)
  }

  return res.status(200).json({ success: true, data })
}