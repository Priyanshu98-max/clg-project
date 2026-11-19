import { Route, Routes } from 'react-router-dom';
import Home from './pages/home/home.jsx';
import Collaboration from './pages/collaboration/collaboration.jsx';
import Login from './pages/login/login.jsx';
import Signup from './pages/signup/signup.jsx';
import Dashboard from './pages/dashboard/dashboard.jsx';
import Businesses from './pages/businesses/businesses.jsx';
import BusinessProfile from './pages/business/business-profile.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './context/useAuth.js';
import { Navigate } from 'react-router-dom';

function NotificationBar() {
  const { notification, dismissNotification } = useAuth();
  if (!notification) return null;

  return (
    <div className="notification-bar" role="status">
      <span>{notification}</span>
      <button type="button" aria-label="Dismiss notification" onClick={dismissNotification}>×</button>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading, authError } = useAuth();
  if (loading) return <p className="page-status" role="status">Loading your workspace…</p>;
  if (authError) return <p className="page-status" role="alert">{authError}</p>;
  return user ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { user, loading, authError } = useAuth();
  if (loading) return <p className="page-status" role="status">Loading your workspace…</p>;
  if (user) return <Navigate to="/dashboard" replace />;
  if (authError) return <p className="page-status" role="alert">{authError}</p>;
  return children;
}

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<GuestRoute><Home /></GuestRoute>} />
      <Route path="/businesses" element={<Businesses />} />
      <Route path="/collaboration" element={<Collaboration />} />
      <Route path="/business/:id" element={<BusinessProfile />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    </Routes>
  );
};

const App = () => <AuthProvider><NotificationBar /><AppRoutes /></AuthProvider>;

export default App;