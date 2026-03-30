import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import OpenAI from 'npm:openai'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''

const PROMPT = `Analiza detalladamente esta comida (puede ser una imagen o una descripción en texto libre) y responde ÚNICAMENTE con un JSON válido (sin etiquetas markdown \`\`\`json).
El JSON debe ser un objeto EXACTO con esta estructura:
{
  "food_name": "Nombre descriptivo de la comida en español",
  "calories": <número entero indicando el total de calorías por la porción que se ve o se describe>,
  "macros": { 
     "p": <proteínas en gramos>, 
     "c": <carbohidratos en gramos>, 
     "f": <grasas en gramos> 
  },
  "confidence": <número decimal entre 0.0 y 1.0 indicando tu seguridad>
}
Si no parece comida o la consulta es inválida, rellena los campos con ceros y pon confidence muy bajo, pero siempre devuelve el JSON válido.
`

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { image_url, text_description } = body

    if (!image_url && !text_description) {
      return jsonError('Se requiere image_url o text_description', 400)
    }

    let messageContent: any[] = [{ type: 'text', text: PROMPT }]

    if (image_url) {
      // 1. Descargar la foto y pasarla a Base64
      const imgResponse = await fetch(image_url)
      if (!imgResponse.ok) throw new Error('No se pudo descargar la imagen')
      const imgBuffer = await imgResponse.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)))
      const mimeType = imgResponse.headers.get('content-type') ?? 'image/jpeg'
      
      messageContent.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } })
    }

    if (text_description) {
      messageContent.push({ type: 'text', text: `Descripción del usuario: "${text_description}"` })
    }

    // 2. Llamar a OpenAI Vision usando el SDK Oficial
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: messageContent }],
      temperature: 0.2,
      max_tokens: 512,
    })

    const rawText = response.choices[0].message.content || ''
    
    // Parse JSON
    const cleaned = rawText.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const analysis = JSON.parse(cleaned || '{"food_name":"Desconocido","calories":0,"macros":{"p":0,"c":0,"f":0},"confidence":0}')

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return jsonError(msg, 500)
  }
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonError(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
