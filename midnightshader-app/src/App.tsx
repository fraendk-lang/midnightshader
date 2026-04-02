import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppHeader from './components/AppHeader'
import { ProjectProvider } from './context/ProjectContext'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import GalleryPage from './pages/GalleryPage'
import LandingPage from './pages/LandingPage'
import CommunityPage from './pages/CommunityPage'
import NotFoundPage from './pages/NotFoundPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

const EditorPage = lazy(() => import('./pages/EditorPage'))
const NodeGraphPage = lazy(() => import('./pages/NodeGraphPage'))

function RouteFallback() {
  return (
    <div className="route-fallback midnight-architect" role="status" aria-live="polite">
      <p>Lade Modul …</p>
    </div>
  )
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-root midnight-architect">
      <AppHeader />
      {children}
    </div>
  )
}

function AppRoutes() {
  const lazyFallback = <RouteFallback />
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/editor"
          element={
            <Suspense fallback={lazyFallback}>
              <EditorPage />
            </Suspense>
          }
        />
        <Route
          path="/node-graph"
          element={
            <Suspense fallback={lazyFallback}>
              <NodeGraphPage />
            </Suspense>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <ProjectProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ProjectProvider>
  )
}
