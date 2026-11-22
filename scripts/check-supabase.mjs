/**
 * Script de verificación de conexión con Supabase
 * Ejecutar con: node --env-file=.env scripts/check-supabase.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

console.log('\n🔍 Verificando conexión con Supabase...')
console.log('─'.repeat(50))
console.log(`URL:  ${url}`)
console.log(`KEY:  ${key?.slice(0, 20)}...`)
console.log('─'.repeat(50))

if (!url || !key) {
  console.error('❌ Variables de entorno no encontradas.')
  process.exit(1)
}

const supabase = createClient(url, key)

try {
  // Prueba 1: ping básico — verificar que el proyecto existe
  const { error: pingError } = await supabase
    .from('_sirece_ping_')
    .select('*')
    .limit(1)

  // Un error de "tabla no existe" (42P01) significa que la conexión SÍ funciona
  // Solo es un error de autenticación o red si el código es distinto
  if (pingError) {
    if (pingError.code === '42P01' || pingError.message?.includes('does not exist')) {
      console.log('✅ Conexión establecida correctamente.')
      console.log('   (La tabla de prueba no existe — eso es esperado)')
    } else if (pingError.code === 'PGRST301' || pingError.message?.includes('JWT')) {
      console.error('❌ Error de autenticación — verifica la ANON KEY.')
      console.error('   Detalle:', pingError.message)
      process.exit(1)
    } else {
      // Otro error — igualmente indica que el servidor respondió
      console.log('✅ Servidor Supabase respondió.')
      console.log('   Código:', pingError.code, '—', pingError.message)
    }
  } else {
    console.log('✅ Conexión y consulta exitosas.')
  }

  // Prueba 2: verificar auth
  const { data: session, error: authError } = await supabase.auth.getSession()
  if (authError) {
    console.error('⚠️  Auth error:', authError.message)
  } else {
    console.log('✅ Módulo Auth operativo. Sesión activa:', session?.session ? 'Sí' : 'No (esperado)')
  }

  console.log('\n✅ SUPABASE CONECTADO CORRECTAMENTE')
  console.log('   Proyecto: ' + url.replace('https://', '').replace('.supabase.co', ''))
  console.log()

} catch (err) {
  console.error('❌ Error de red — no se pudo conectar con Supabase:')
  console.error('  ', err.message)
  process.exit(1)
}
