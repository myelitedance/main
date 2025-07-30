import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, message } = req.body

  try {
    const data = await resend.emails.send({
      from: 'jason@myelitedance.com', // <- Hardcoded to test
      to: 'frontdesk@myelitedance.com',
      subject: 'New Registration Inquiry',
      reply_to: [email], // optional but good to keep
      html: `
        <h2>New Inquiry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `,
    })

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Email send failed:', error)
    return res.status(500).json({ error: error.message })
  }
}