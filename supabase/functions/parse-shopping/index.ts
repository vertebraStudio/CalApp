import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import OpenAI from 'npm:openai'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''

const SYSTEM_PROMPT = `Eres un asistente nutricional experto. Tu tarea es analizar descripciones de compras de alimentos (en texto libre o fotos de ticket) y extraer cada producto individual con su cantidad y sus macronutrientes estimados por 100g.

Responde ÚNICAMENTE con un JSON válido (sin markdown ni backticks) que sea un array de objetos con esta estructura EXACTA:
[
  {
    "name": "Nombre del alimento en español, sin marca si no se especifica",
    "category": "Una de: Proteínas, Lácteos, Vegetales, Frutas, Cereales, Despensa, Bebidas, Otros",
    "stock_amount": <número con la cantidad comprada>,
    "stock_unit": "<'g', 'ml', 'uds'>",
    "calories_per_100g": <número entero>,
    "protein_per_100g": <número decimal>,
    "carbs_per_100g": <número decimal>,
    "fats_per_100g": <número decimal>,
    "low_stock_threshold": <número razonable para alertar stock bajo, ej 200 para 1kg de pollo>
  }
]

Reglas importantes:
- Si se menciona "1 kilo" → stock_amount: 1000, stock_unit: "g"
- Si se menciona "1 litro" → stock_amount: 1000, stock_unit: "ml"
- Si se menciona "un pack de 6 yogures" → stock_amount: 6, stock_unit: "uds"
- Si se menciona "una docena de huevos" → stock_amount: 12, stock_unit: "uds"
- Los macros deben ser valores realistas por 100g del alimento
- Divide correctamente si hay múltiples productos en la misma descripción
- Si no puedes identificar un alimento, inclúyelo igualmente con macros en cero y confidence baja
- Nunca devuelvas nada fuera del array JSON`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { text_description, image_url } = body

    if (!text_description && !image_url) {
      return new Response(JSON.stringify({ error: 'Se requiere text_description o image_url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    let messageContent: any[] = [{ type: 'text', text: SYSTEM_PROMPT }]

    if (text_description) {
      messageContent.push({
        type: 'text',
        text: `Lista de compra del usuario: "${text_description}"`
      })
    }

    if (image_url) {
      // Descargar la imagen y convertir a base64
      const imgResponse = await fetch(image_url)
      if (!imgResponse.ok) throw new Error('No se pudo descargar la imagen del ticket')
      const imgBuffer = await imgResponse.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)))
      const mimeType = imgResponse.headers.get('content-type') ?? 'image/jpeg'
      
      messageContent.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${base64}` }
      })
      messageContent.push({
        type: 'text',
        text: 'Esta es una foto de un ticket de compra. Identifica todos los productos alimenticios con sus cantidades.'
      })
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: messageContent }],
      temperature: 0.2,
      max_tokens: 2048,
    })

    const rawText = response.choices[0].message.content ?? '[]'
    const cleaned = rawText.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    
    let items: any[]
    try {
      items = JSON.parse(cleaned)
      if (!Array.isArray(items)) items = [items]
    } catch {
      items = []
    }

    return new Response(JSON.stringify(items), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
