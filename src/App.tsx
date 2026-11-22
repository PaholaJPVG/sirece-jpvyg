import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppConfigProvider } from '@/context/AppConfigContext'
import { AuthProvider } from '@/context/AuthContext'
import { MainLayout } from '@/components/layout/MainLayout'
import Dashboard from '@/pages/Dashboard'
import Personal from '@/pages/Personal'
import Estudiantes from '@/pages/Estudiantes'
import ImportarEstudiantes from '@/pages/ImportarEstudiantes'
import RegistrarFalta from '@/pages/RegistrarFalta'
import HistorialIncidencias from '@/pages/HistorialIncidencias'
import SeguimientoReincidencias from '@/pages/SeguimientoReincidencias'
import SeguimientoInstitucional from '@/pages/SeguimientoInstitucional'
import InformesEstadisticas from '@/pages/InformesEstadisticas'
import Configuracion from '@/pages/Configuracion'

export default function App() {
  return (
    <AppConfigProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Layout principal — todas las rutas */}
            <Route element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="personal"        element={<Personal />} />
              <Route path="estudiantes"     element={<Estudiantes />} />
              <Route path="importar"        element={<ImportarEstudiantes />} />
              <Route path="registrar-falta" element={<RegistrarFalta />} />
              <Route path="historial"       element={<HistorialIncidencias />} />
              <Route path="reincidencias"               element={<SeguimientoReincidencias />} />
              <Route path="seguimiento-reincidencias"   element={<SeguimientoReincidencias />} />
              <Route path="seguimiento"                 element={<SeguimientoInstitucional />} />
              <Route path="seguimiento-institucional"   element={<SeguimientoInstitucional />} />
              <Route path="informes"        element={<InformesEstadisticas />} />
              <Route path="configuracion"   element={<Configuracion />} />

              {/* Ruta por defecto: redirigir al panel */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppConfigProvider>
  )
}
