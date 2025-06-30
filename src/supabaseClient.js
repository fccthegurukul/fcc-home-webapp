// supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
// require('dotenv').config(); // ये ज़रूरी है अगर env variables use हो रहे हों

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role Key

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
