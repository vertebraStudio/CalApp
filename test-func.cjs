require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing invoke...");
  const { data, error } = await supabase.functions.invoke('analyze-food', {
    body: { text_description: 'una manzana' }
  });
  console.log("DATA:", data);
  if (error) {
    console.log("ERROR:", error.message);
    if (error.context) {
      console.log("ERROR CONTEXT:", await error.context.text());
    }
  }
}

test();
