import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { encodeBase64 } from "https://deno.land/std@0.208.0/encoding/base64.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''

const PROMPT_FOOD = `Analiza esta comida y devuelve un JSON: { "food_name": "...", "calories": 0, "macros": { "p": 0, "c": 0, "f": 0 }, "confidence": 0.0 }`

const PROMPT_LABEL = `Eres un experto de élite en lectura de tablas nutricionales. 
Analiza la tabla nutricional de la imagen con atención extrema a las unidades y cantidades de referencia.

OBJETIVO:
Extraer los valores nutricionales SIEMPRE PARA 100g (o 100ml) y detectar si existe una "Ración" específica.

REGLAS DE ORO:
1. IDENTIFICA LAS COLUMNAS: Identifica cuál es la columna de "100g" y cuál es la columna de "Por ración/unidad". ¡No las mezcles!
2. PRIORIZA 100G: Extrae los valores (calorías, macros, azúcar, sal) de la columna de 100g.
3. DETECTA LA RACIÓN: Busca cuánto pesa UNA ración (ej: "3 galletas = 35g", "Una taza de 200ml", "Serving Size: 30g").
4. CALCULO DE SAL: Si solo ves "Sodio" (Sodium), multiplica por 2.5 para obtener la Sal.

Responde ÚNICAMENTE con un JSON válido con esta estructura:
{
  "food_name": "Nombre (solo para control interno)",
  "brand": "Marca (solo para control interno)",
  "calories_per_100g": <número entero, calorías en 100g/ml>,
  "protein_per_100g": <número decimal, proteínas en 100g/ml>,
  "carbs_per_100g": <número decimal, carbohidratos en 100g/ml>,
  "fats_per_100g": <número decimal, grasas en 100g/ml>,
  "sugar_per_100g": <número decimal, azúcares en 100g/ml>,
  "salt_per_100g": <número decimal, sal en 100g/ml>,
  "serving_size_g": <número entero, peso en GRAMOS de una ración, o 0 si no se ve>,
  "serving_unit": "unidad (ej: 'unidad', 'ración', 'galleta', 'vaso') o 'ración' por defecto",
  "confidence": <número decimal 0.0 a 1.0>
}
No incluyas explicaciones ni etiquetas markdown.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { image_url, text_description, mode = 'food' } = await req.json()
    console.log(`[analyze-food] START - mode: ${mode}`)

    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')

    let finalImageUrl = image_url

    // Si tenemos una URL, la descargamos y la pasamos a Base64 para asegurar que OpenAI la vea siempre
    if (image_url) {
      console.log(`[analyze-food] Downloading image: ${image_url}`)
      const imgResp = await fetch(image_url)
      if (imgResp.ok) {
        const arrayBuffer = await imgResp.arrayBuffer()
        const base64 = encodeBase64(arrayBuffer)
        const contentType = imgResp.headers.get('content-type') || 'image/jpeg'
        finalImageUrl = `data:${contentType};base64,${base64}`
        console.log(`[analyze-food] Image converted to Base64 (length: ${base64.length})`)
      }
    }

    const prompt = mode === 'label' ? PROMPT_LABEL : PROMPT_FOOD
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...(finalImageUrl ? [{ type: "image_url", image_url: { url: finalImageUrl, detail: "high" } }] : []),
          ...(text_description ? [{ type: "text", text: `Contexto extra: ${text_description}` }] : [])
        ]
      }
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0,
        max_tokens: 800
      }),
    })

    const result = await response.json()
    
    if (result.error) {
      console.error('[OpenAI Error]', result.error)
      throw new Error(result.error.message || 'Error de OpenAI')
    }

    const content = result.choices[0].message.content
    console.log('[analyze-food] Raw content:', content)

    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim()
    const analysis = JSON.parse(jsonStr)

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('[analyze-food] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
