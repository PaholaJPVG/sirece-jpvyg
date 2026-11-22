const b = require('fs').readFileSync('dist/assets/index-BWVFN4aD.js', 'utf8')
// Vite inyecta las variables VITE_ en el bundle — eso es normal y esperado para el cliente
// La anon key de Supabase es PÚBLICA por diseño (Row Level Security protege los datos)
console.log('URL en bundle:', b.includes('nsqfwfvdesglssytlrbd'))
console.log('KEY en bundle:', b.includes('sb_publishable'))
console.log('\nNOTA: La URL y anon key de Supabase son publicas por diseno.')
console.log('La seguridad se gestiona con Row Level Security (RLS) en la BD.')
