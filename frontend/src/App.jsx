/**
 * Main App Component
 * 
 * Sets up routing and main layout for the VR Therapy Dashboard.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PatientManagement from './pages/PatientManagement';
import PatientDetail from './pages/PatientDetail';
import SessionManagement from './pages/SessionManagement';
import SessionDetail from './pages/SessionDetail';
import SceneBuilder from './pages/SceneBuilder';
import Reports from './pages/Reports';
import UploadedReports from './pages/UploadedReports';

function App() {
  return (
    <Routes>
      {/* Main layout wrapper */}
      <Route path="/" element={<Layout />}>
        {/* Dashboard - Home page */}
        <Route index element={<Dashboard />} />
        
        {/* Patient Management */}
        <Route path="patients" element={<PatientManagement />} />
        <Route path="patients/:id" element={<PatientDetail />} />
        
        {/* Session Management */}
        <Route path="sessions" element={<SessionManagement />} />
        <Route path="sessions/:id" element={<SessionDetail />} />
        <Route path="sessions/new" element={<SceneBuilder />} />
        
        {/* Scene Builder */}
        <Route path="scene-builder" element={<SceneBuilder />} />
        <Route path="scene-builder/:sessionId" element={<SceneBuilder />} />
        
        {/* Reports */}
        <Route path="reports" element={<Reports />} />
        <Route path="reports/:patientId" element={<Reports />} />
        <Route path="reports/files" element={<UploadedReports />} />
        
        {/* Catch-all redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
