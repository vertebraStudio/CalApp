import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'npm:openai'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return jsonError('A valid search query string is required', 400)
    }

    const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    // 1. BUSCAR EN LA BASE DE DATOS GLOBAL PRIMERO
    const { data: globalResults, error: globalError } = await supabase
      .from('global_foods')
      .select('*')
      .ilike('normalized_name', `%${normalizedQuery}%`)
      .limit(5)

    if (globalError) console.error('Error fetching global foods:', globalError)

    // Formatear resultados de la comunidad si existen
    const communityItems = (globalResults || []).map(f => ({
      food_id: f.id,
      food_name: f.name,
      brand_name: f.brand || 'Comunidad',
      description: 'Verificado por la comunidad ✅',
      is_global: true,
      params_per_100g: {
        calories: Math.round(f.calories_per_100g),
        macros: {
          p: f.protein_per_100g,
          c: f.carbs_per_100g,
          f: f.fats_per_100g,
          sugar: f.sugar_per_100g,
          salt: f.salt_per_100g
        }
      }
    }))

    // 2. SI NO HAY SUFICIENTES RESULTADOS, USAR IA
    let finalResults = [...communityItems]

    if (finalResults.length < 3) {
      const prompt = `
        Actúa como una experta base de datos nutricional de alimentos de supermercados (especialmente de España como Mercadona, Carrefour, etc).
        El usuario está buscando: "${query}".
        
        Devuélveme una lista en formato JSON estricto (SIN MARKDOWN) de los 3 alimentos más relevantes.
        Estructura exacta:
        [
          {
            "food_id": "temp_id",
            "food_name": "Nombre claro",
            "brand_name": "Marca o 'Genérico'",
            "description": "Breve descripción",
            "params_per_100g": {
              "calories": <numero>,
              "macros": { "p": <num>, "c": <num>, "f": <num>, "sugar": <num>, "salt": <num> }
            }
          }
        ]
      `
      const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
      const aiResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      })

      const cleaned = aiResponse.choices[0].message.content?.replace(/```json?\n?/g, '').replace(/```/g, '').trim() || '[]'
      const aiItems = JSON.parse(cleaned).map((item: any) => ({ ...item, is_global: false }))
      
      // Mezclar y evitar duplicados básicos
      finalResults = [...finalResults, ...aiItems].slice(0, 5)
    }

    return new Response(JSON.stringify(finalResults), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'Unknown error', 500)
  }
})

function jsonError(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
