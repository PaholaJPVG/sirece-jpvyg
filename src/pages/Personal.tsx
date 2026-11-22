import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Shield, User, Lock, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { personalService, type CreatePersonalInput } from '@/lib/personalService'
import type { PersonalInstitucional, CargoPersonal } from '@/types'

const ROL_BADGE: Record<CargoPersonal, 'primary' | 'success'> = {
  profesor: 'primary',
  auxiliar: 'success',
}

const ROL_LABEL: Record<CargoPersonal, string> = {
  profesor: 'Profesor',
  auxiliar: 'Auxiliar de Educación',
}

const ROL_OPTIONS: { value: CargoPersonal; label: string }[] = [
  { value: 'profesor', label: 'Profesor' },
  { value: 'auxiliar', label: 'Auxiliar' },
]

interface FormState {
  id?: string
  nombres: string
  apellidos: string
  rol: CargoPersonal
  usuario: string
  password_acceso: string
  activo: boolean
}

const INITIAL_FORM: FormState = {
  nombres: '',
  apellidos: '',
  rol: 'profesor',
  usuario: '',
  password_acceso: '',
  activo: true,
}

export default function Personal() {
  const [personal, setPersonal] = useState<PersonalInstitucional[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [tableMissing, setTableMissing] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [rolFiltro, setRolFiltro] = useState<string>('')

  // Modales
  const [modalOpen, setModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Confirmar eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedPersonal, setSelectedPersonal] = useState<PersonalInstitucional | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Mensaje de éxito temporal
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const showSuccess = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 3500)
  }

  // Cargar datos desde Supabase
  const cargarPersonal = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    setTableMissing(false)

    const res = await personalService.getAll()

    if (res.tableMissing) {
      setTableMissing(true)
    } else if (res.error) {
      setErrorMsg(res.error)
    } else {
      setPersonal(res.data)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    cargarPersonal()
  }, [cargarPersonal])

  // Abrir modal para crear
  const handleOpenCreate = () => {
    setIsEditing(false)
    setForm(INITIAL_FORM)
    setFormErrors({})
    setModalOpen(true)
  }

  // Abrir modal para editar
  const handleOpenEdit = (p: PersonalInstitucional) => {
    setIsEditing(true)
    setForm({
      id: p.id,
      nombres: p.nombres || '',
      apellidos: p.apellidos || '',
      rol: p.rol,
      usuario: p.usuario || '',
      password_acceso: '', // se deja en blanco si no se desea cambiar
      activo: p.activo,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  // Validar y guardar formulario
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}

    if (!form.nombres.trim()) errors.nombres = 'Los nombres son obligatorios.'
    if (!form.apellidos.trim()) errors.apellidos = 'Los apellidos son obligatorios.'

    if (!form.usuario.trim()) {
      errors.usuario = 'El nombre de usuario es obligatorio.'
    } else if (form.usuario.trim().length < 3) {
      errors.usuario = 'El usuario debe tener al menos 3 caracteres.'
    } else if (!/^[a-zA-Z0-9._-]+$/.test(form.usuario.trim())) {
      errors.usuario = 'Solo se permiten letras, números, puntos y guiones.'
    }

    if (!isEditing && !form.password_acceso.trim()) {
      errors.password_acceso = 'La contraseña de acceso es obligatoria.'
    } else if (!isEditing && form.password_acceso.trim().length < 4) {
      errors.password_acceso = 'La contraseña debe tener al menos 4 caracteres.'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setSaving(true)
    setFormErrors({})

    if (isEditing && form.id) {
      const res = await personalService.update({
        id: form.id,
        nombres: form.nombres,
        apellidos: form.apellidos,
        rol: form.rol,
        usuario: form.usuario,
        password_acceso: form.password_acceso ? form.password_acceso : undefined,
        activo: form.activo,
      })

      if (res.error) {
        setFormErrors({ general: res.error })
      } else {
        setModalOpen(false)
        showSuccess('Datos del personal actualizados correctamente en Supabase.')
        cargarPersonal()
      }
    } else {
      const input: CreatePersonalInput = {
        nombres: form.nombres,
        apellidos: form.apellidos,
        rol: form.rol,
        usuario: form.usuario,
        password_acceso: form.password_acceso,
        activo: form.activo,
      }
      const res = await personalService.create(input)

      if (res.error) {
        setFormErrors({ general: res.error })
      } else {
        setModalOpen(false)
        showSuccess('Nuevo personal registrado exitosamente en Supabase.')
        cargarPersonal()
      }
    }

    setSaving(false)
  }

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!selectedPersonal) return
    setDeleting(true)
    const res = await personalService.delete(selectedPersonal.id)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setDeleteModalOpen(false)
      setSelectedPersonal(null)
      showSuccess(`Registro de ${selectedPersonal.nombres} eliminado correctamente.`)
      cargarPersonal()
    }
    setDeleting(false)
  }

  // Filtrado de personal
  const personalFiltrado = personal.filter((p) => {
    const query = busqueda.toLowerCase().trim()
    const matchBusqueda =
      !query ||
      p.nombres.toLowerCase().includes(query) ||
      p.apellidos.toLowerCase().includes(query) ||
      p.usuario.toLowerCase().includes(query)

    const matchRol = !rolFiltro || p.rol === rolFiltro

    return matchBusqueda && matchRol
  })

  return (
    <div className="space-y-5">
      {/* Toast de éxito */}
      {successToast && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm transition-all animate-fade-in shadow-sm">
          <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Banner si la tabla está pendiente de creación en Supabase */}
      {tableMissing && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-4 shadow-sm">
          <AlertCircle size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Tabla "personal" pendiente de actualización en Supabase</h4>
            <p className="text-xs text-amber-800 mt-1">
              Ejecuta el nuevo script SQL en el <strong>SQL Editor</strong> de Supabase para recrear la tabla con la estructura ajustada (Nombres, Apellidos, Rol, Usuario y Contraseña).
            </p>
            <Button
              variant="secondary"
              size="xs"
              className="mt-3 bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
              leftIcon={<RefreshCw size={13} />}
              onClick={cargarPersonal}
            >
              Comprobar nuevamente
            </Button>
          </div>
        </div>
      )}

      {/* Error de consulta */}
      {errorMsg && !tableMissing && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Personal Institucional</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Registro y control de acceso de Profesores y Auxiliares de la I.E. Juan Pablo Viscardo y Guzmán
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={cargarPersonal}
              disabled={loading}
              title="Recargar datos"
            >
              Actualizar
            </Button>
            <Button size="sm" leftIcon={<Plus size={15} />} onClick={handleOpenCreate}>
              Agregar personal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Barra de filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="sm:col-span-2">
              <Input
                placeholder="Buscar por nombres, apellidos o usuario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                leftAddon={<Search size={14} />}
              />
            </div>
            <div>
              <Select
                value={rolFiltro}
                onChange={(e) => setRolFiltro(e.target.value)}
                options={[
                  { value: '', label: 'Todos los cargos' },
                  { value: 'profesor', label: 'Profesores' },
                  { value: 'auxiliar', label: 'Auxiliares' },
                ]}
              />
            </div>
          </div>

          {/* Estado de carga */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spinner size="lg" />
              <p className="text-xs text-gray-500">Consultando datos en Supabase...</p>
            </div>
          ) : personalFiltrado.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {personalFiltrado.map((p) => {
                const initials = (p.nombres[0] || '') + (p.apellidos[0] || '')
                return (
                  <div
                    key={p.id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow space-y-3 bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs font-bold uppercase shadow-sm">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">
                            {p.nombres} {p.apellidos}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant={ROL_BADGE[p.rol] || 'primary'} size="sm">
                              {ROL_LABEL[p.rol] || p.rol}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {!p.activo && <Badge variant="default" size="sm">Inactivo</Badge>}
                    </div>

                    {/* Usuario de acceso */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                      <span className="flex items-center gap-1.5 font-mono text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                        <User size={12} className="text-gray-400" />
                        <strong>@{p.usuario}</strong>
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {p.activo ? 'Habilitado' : 'Deshabilitado'}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Pencil size={12} />}
                        onClick={() => handleOpenEdit(p)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Trash2 size={12} />}
                        className="text-red-500 hover:bg-red-50 ml-auto"
                        onClick={() => {
                          setSelectedPersonal(p)
                          setDeleteModalOpen(true)
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
              <Shield size={34} className="mx-auto mb-2 opacity-30 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">
                {personal.length === 0
                  ? 'No hay personal registrado en la base de datos'
                  : 'No se encontraron resultados con ese criterio'}
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                {personal.length === 0
                  ? 'Haz clic en "Agregar personal" para registrar al primer profesor o auxiliar.'
                  : 'Prueba modificando el texto de búsqueda o el filtro de cargo.'}
              </p>
              {personal.length === 0 && (
                <Button size="sm" className="mt-3" leftIcon={<Plus size={14} />} onClick={handleOpenCreate}>
                  Registrar primer personal
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para Registrar / Editar Personal */}
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={isEditing ? 'Editar Personal' : 'Registrar Nuevo Personal'}
        description={
          isEditing
            ? 'Modifica los datos del docente o auxiliar institucional en Supabase.'
            : 'Completa la información para crear el usuario y acceso del profesor o auxiliar.'
        }
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formErrors.general && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{formErrors.general}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nombres"
              placeholder="Ej: Juan Carlos"
              value={form.nombres}
              onChange={(e) => setForm({ ...form, nombres: e.target.value })}
              error={formErrors.nombres}
              required
            />
            <Input
              label="Apellidos"
              placeholder="Ej: García Mendoza"
              value={form.apellidos}
              onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
              error={formErrors.apellidos}
              required
            />
          </div>

          <Select
            label="Cargo / Rol Institucional"
            options={ROL_OPTIONS}
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value as CargoPersonal })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Usuario"
              placeholder="Ej: jgarcia"
              value={form.usuario}
              onChange={(e) => setForm({ ...form, usuario: e.target.value.toLowerCase().replace(/\s+/g, '') })}
              error={formErrors.usuario}
              leftAddon={<User size={14} />}
              hint="Identificador para entrar"
              required
            />
            <Input
              label={isEditing ? 'Nueva Contraseña (opcional)' : 'Contraseña de acceso'}
              type="password"
              placeholder="••••••••"
              value={form.password_acceso}
              onChange={(e) => setForm({ ...form, password_acceso: e.target.value })}
              error={formErrors.password_acceso}
              leftAddon={<Lock size={14} />}
              hint={isEditing ? 'Dejar en blanco para conservar la actual' : 'Mínimo 4 caracteres'}
              required={!isEditing}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="personal-activo"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              className="rounded border-gray-300 text-[#1e3a5f] focus:ring-[#2980b9] h-4 w-4"
            />
            <label htmlFor="personal-activo" className="text-sm font-medium text-gray-700 cursor-pointer">
              Personal activo en la institución
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" loading={saving}>
              {isEditing ? 'Guardar Cambios' : 'Registrar Personal'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Personal"
        message={`¿Estás seguro de que deseas eliminar a ${selectedPersonal?.nombres} ${selectedPersonal?.apellidos} (@${selectedPersonal?.usuario})? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
