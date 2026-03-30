# Especificaciones del Proyecto: NutriSnap PWA

## 🎯 Objetivo
Crear una Progressive Web App (PWA) que funcione como planificador de comidas y calculadora de calorías mediante reconocimiento visual de alimentos potenciado por IA.

## 🛠️ Stack Tecnológico (Estricto)
- **Frontend:** React + Vite (TypeScript).
- **Estilo:** Tailwind CSS.
- **Estado/Datos:** TanStack Query (React Query).
- **PWA:** vite-plugin-pwa.
- **BaaS (Backend):** Supabase.
  - **Auth:** Email & Google Provider.
  - **DB:** PostgreSQL con RLS.
  - **Storage:** Buckets para imágenes de comida.
  - **Edge Functions:** Deno/TypeScript para lógica de IA.
- **IA:** Google Gemini 1.5 Flash (API de visión).

## 🗄️ Esquema de Base de Datos (Tablas Clave)
1. `profiles`: id (uuid), username, goal_calories, weight, height.
2. `meals`: id, user_id, image_url, name, calories, protein, carbs, fats, created_at.
3. `planner`: id, user_id, meal_id (fk), date, meal_type (breakfast/lunch/snack).

## 🧠 Lógica de Procesamiento de IA
1. El usuario sube foto a Supabase Storage.
2. Se dispara una Edge Function.
3. Gemini analiza la imagen y devuelve un JSON estricto:
   ```json
   {
     "food_name": "string",
     "calories": number,
     "macros": { "p": n, "c": n, "f": n },
     "confidence": 0-1
   }