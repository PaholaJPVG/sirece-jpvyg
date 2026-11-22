// ─── Servicio de Envío de WhatsApp Automático con Green-API ───────────────────
// I.E. Juan Pablo Viscardo y Guzmán — SIRECE

const getEnv = (key: string, fallback: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key]
    }
  } catch {
    // Entorno sin import.meta
  }
  return fallback
}

const GREEN_API_URL = getEnv('VITE_GREEN_API_URL', 'https://7107.api.greenapi.com')
const ID_INSTANCE = getEnv('VITE_GREEN_API_ID_INSTANCE', '710722810380')
const API_TOKEN_INSTANCE = getEnv(
  'VITE_GREEN_API_TOKEN_INSTANCE',
  '4e7a20a0f79040bdba6e0f54ca5c470e0ed5e9316d5e400890'
)

export const WHATSAPP_OFICIAL_NUMERO = getEnv(
  'VITE_WHATSAPP_NUMERO_OFICIAL',
  '+51 964 117 378'
)

export interface GreenApiResponse {
  success: boolean
  idMessage?: string
  error?: string | null
}

/**
 * Limpia y normaliza el número de WhatsApp a formato peruano 519XXXXXXXX.
 * Limpia todo caracter no numérico y toma siempre los últimos 9 dígitos
 * (manejando prefijos duplicados como 5151 o 51), garantizando que tenga 9 dígitos
 * y comience con 9 (estándar móvil de Perú).
 */
export function normalizarNumeroParaGreenApi(numero: string): string | null {
  if (!numero) return null
  // Remover todo carácter no numérico (+, espacios, guiones, paréntesis)
  const digits = numero.replace(/\D/g, '')
  if (digits.length < 9) return null

  // Tomar siempre los últimos 9 dígitos
  const local9 = digits.slice(-9)

  // Validar que tenga 9 dígitos y empiece con 9
  if (local9.length === 9 && local9.startsWith('9')) {
    return `51${local9}`
  }

  return null
}

/**
 * Envía un mensaje formal de WhatsApp mediante Green-API en segundo plano
 * sin abrir ventanas externas ni requerir interacción del teléfono del docente.
 */
export async function enviarWhatsAppGreenApi(
  numeroDestino: string,
  mensaje: string
): Promise<GreenApiResponse> {
  const numeroLimpio = normalizarNumeroParaGreenApi(numeroDestino)

  if (!numeroLimpio) {
    const errorMsg = `El número "${numeroDestino}" no es un teléfono móvil válido para WhatsApp en Perú (debe tener 9 dígitos y empezar con 9).`
    console.error('[Green-API]', errorMsg)
    return {
      success: false,
      error: errorMsg,
    }
  }

  const endpoint = `${GREEN_API_URL}/waInstance${ID_INSTANCE}/sendMessage/${API_TOKEN_INSTANCE}`
  const chatId = `${numeroLimpio}@c.us`

  console.log(`[Green-API] Despachando mensaje a chatId: "${chatId}" (número origen: "${numeroDestino}")`)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        message: mensaje,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let detalle = errorText
      try {
        const jsonError = JSON.parse(errorText)
        detalle = jsonError.message || jsonError.error || errorText
      } catch {
        // Mantener errorText crudo
      }
      const fullError = `Green-API error (${response.status}) para chatId "${chatId}": ${detalle}`
      console.error('[Green-API]', fullError)
      return {
        success: false,
        error: fullError,
      }
    }

    const data = await response.json()
    console.log('[Green-API] Respuesta de envío exitosa:', data)

    if (data && data.idMessage) {
      return {
        success: true,
        idMessage: data.idMessage,
        error: null,
      }
    }

    return {
      success: false,
      error: `La respuesta de Green-API para chatId "${chatId}" no incluyó confirmación de idMessage.`,
    }
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'Error desconocido de conexión al enviar WhatsApp'
    const fullError = `Error de red al conectar con Green-API (chatId: "${chatId}"): ${errorMsg}`
    console.error('[Green-API]', fullError)
    return {
      success: false,
      error: fullError,
    }
  }
}

/**
 * Consulta el estado actual de la instancia vinculada de WhatsApp
 */
export async function consultarEstadoGreenApi(): Promise<{
  estado: string
  autorizado: boolean
}> {
  try {
    const endpoint = `${GREEN_API_URL}/waInstance${ID_INSTANCE}/getStateInstance/${API_TOKEN_INSTANCE}`
    const response = await fetch(endpoint)
    if (!response.ok) {
      return { estado: 'error', autorizado: false }
    }
    const data = await response.json()
    return {
      estado: data.stateInstance || 'desconocido',
      autorizado: data.stateInstance === 'authorized',
    }
  } catch {
    return { estado: 'sin_conexion', autorizado: false }
  }
}
