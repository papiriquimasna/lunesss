import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import StoragePage from './pages/StoragePage';
import CleaningPage from './pages/CleaningPage';
import TrainingPage from './pages/TrainingPage';
import PredictionsPage from './pages/PredictionsPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Componente para proteger rutas
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const token = localStorage.getItem('access_token');

  return (
    <Routes>
      {/* Auth Routes */}
      <Route 
        path="/login" 
        element={token ? <Navigate to="/" replace /> : <LoginPage />} 
      />
      <Route 
        path="/register" 
        element={token ? <Navigate to="/" replace /> : <RegisterPage />} 
      />
      
      {/* Protected Dashboard Routes */}
      <Route element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/storage" element={<StoragePage />} />
        <Route path="/cleaning" element={<CleaningPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/predictions" element={<PredictionsPage />} />
        <Route path="/statistics" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
