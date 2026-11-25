import { useState } from 'react'
import { LogIn, AlertCircle, CheckCircle, Shield, User } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'

interface LoginModalProps {
  open: boolean
  onClose: () => void
}

export const LoginModal = ({ open, onClose }: LoginModalProps) => {
  const { signIn } = useAuth()
  const [identificador, setIdentificador] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleClose = () => {
    setErrorMsg(null)
    setSuccess(false)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!identificador.trim() || !password) {
      setErrorMsg('Por favor ingresa tu usuario y contraseña.')
      return
    }

    setLoading(true)
    const res = await signIn(identificador.trim(), password)

    if (res.error) {
      if (res.error.includes('Invalid login credentials')) {
        setErrorMsg('Credenciales incorrectas. Verifica tu usuario y contraseña.')
      } else {
        setErrorMsg(res.error)
      }
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => {
        setLoading(false)
        setSuccess(false)
        setIdentificador('')
        setPassword('')
        onClose()
      }, 500)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Acceso al Sistema SIRECE"
      description="Ingresa con tu usuario institucional para acceder a tus funciones en el sistema."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle size={15} className="text-green-600 flex-shrink-0" />
            <span>¡Sesión iniciada correctamente!</span>
          </div>
        )}

        <Input
          label="Usuario"
          placeholder="Ej: jgarcia o tu usuario registrado"
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
          leftAddon={<User size={14} />}
          required
          autoFocus
        />

        <Input
          label="Contraseña de acceso"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="pt-2">
          <Button fullWidth type="submit" loading={loading} leftIcon={<LogIn size={15} />}>
            Iniciar Sesión
          </Button>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
          <Shield size={14} className="mt-0.5 text-blue-600 flex-shrink-0" />
          <div>
            <strong>Credenciales institucionales:</strong>
            <p className="mt-0.5 text-blue-700">
              Los Profesores y Auxiliares ingresan con el usuario y la contraseña asignados en el módulo <strong>Personal</strong>.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  )
}
