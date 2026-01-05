import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function uploadImage(
  file: File,
  pathPrefix: string
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${pathPrefix}.${fileExt}`

  const { error } = await supabase.storage
    .from('sizing_storage')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`)
  }

  const { data } = supabase.storage
    .from('sizing_storage')
    .getPublicUrl(fileName)

  return data.publicUrl
}
