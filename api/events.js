// /api/events.js
export default async function handler(req, res) {
  try {
    const CAL_ID = process.env.GCAL_CALENDAR_ID
    const API_KEY = process.env.GCAL_API_KEY
    if (!CAL_ID || !API_KEY) throw new Error('Missing GCAL env vars')

    const { timeMin, timeMax, maxResults = 250 } = req.query || {}
    const now = new Date()
    const defaultMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const defaultMax = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59).toISOString()

    const params = new URLSearchParams({
      key: API_KEY,
      singleEvents: 'true',
      orderBy: 'startTime',
      timeZone: 'America/Chicago',
      maxResults: String(maxResults),
      timeMin: timeMin || defaultMin,
      timeMax: timeMax || defaultMax,
    })

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CAL_ID)}/events?${params}`
    const r = await fetch(url)
    if (!r.ok) throw new Error(await r.text())
    const data = await r.json()

    const events = (data.items || []).map((e) => ({
      id: e.id,
      title: e.summary || 'Untitled',
      description: e.description || '',
      location: e.location || '',
      start: e.start.dateTime || e.start.date,
      end: e.end.dateTime || e.end.date,
      htmlLink: e.htmlLink,
    }))

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    res.status(200).json({ events })
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) })
  }
}