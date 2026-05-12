// import { signOut } from 'firebase/auth';
// import { Activity, LogOut, Shield, Wifi, WifiOff } from 'lucide-react';
// import { Link, useLocation } from 'react-router-dom';
// import { auth } from '../firebase/config';
// import useAuthStore from '../store/useAuthStore';
// import useSessionStore from '../stores/useSessionStore';

// export default function Navbar() {
//   const location = useLocation();
//   const user = useAuthStore((state) => state.user);
//   const isConnected = useSessionStore((state) => state.isConnected);

//   async function handleLogout() {
//     if (auth) {
//       await signOut(auth);
//     }
//   }

//   return (
//     <nav className="navbar">
//       <div className="navbar-inner">
//         <Link to={user ? (user.role === 'mentor' ? '/mentor' : '/dashboard') : '/'} className="navbar-brand">
//           <span className="navbar-logo">
//             <Activity className="icon-md" />
//           </span>
//           <span className="navbar-title">
//             Fit<span className="navbar-dot">·</span>Mon
//           </span>
//         </Link>

//         <div className="navbar-links">
//           <Link
//             to={user ? (user.role === 'mentor' ? '/mentor' : '/dashboard') : '/'}
//             className={`navbar-link ${['/dashboard', '/mentor', '/'].includes(location.pathname) ? 'is-active' : ''}`}
//           >
//             Home
//           </Link>

//           {user?.role === 'trainee' ? (
//             <Link
//               to="/session"
//               className={`navbar-link ${location.pathname === '/session' ? 'is-active' : ''}`}
//             >
//               Session
//             </Link>
//           ) : null}

//           {user ? (
//             <div className="navbar-meta">
//               <Shield className="icon-sm text-accent" />
//               <span>{user.role}</span>
//             </div>
//           ) : null}

//           <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
//             {isConnected ? (
//               <>
//                 <Wifi className="icon-sm" />
//                 <span>Socket Live</span>
//               </>
//             ) : (
//               <>
//                 <WifiOff className="icon-sm" />
//                 <span>Offline</span>
//               </>
//             )}
//           </div>

//           {user ? (
//             <button type="button" onClick={handleLogout} className="btn-secondary navbar-cta button-inline">
//               <LogOut className="icon-sm" />
//               Logout
//             </button>
//           ) : (
//             <Link to="/login" className="btn-primary navbar-cta button-inline">
//               Sign In
//             </Link>
//           )}
//         </div>
//       </div>
//     </nav>
//   );
// }

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import useAuthStore from '../store/useAuthStore';

/**
 * AppNavbar — shared navbar for all authenticated pages.
 * Usage: <AppNavbar />
 */
export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore((state) => state.user);

  if (pathname === '/' || pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const isCoach = user?.role === 'coach' || user?.role === 'mentor';
  const homePath = isCoach ? '/coach' : '/dashboard';

  const links = isCoach
    ? [
        { label: 'Home', to: '/coach' },
        { label: 'Session', to: '/session' },
      ]
    : [
        { label: 'Home', to: '/dashboard' },
        { label: 'Workout', to: '/workout' },
        { label: 'Session', to: '/session' },
        { label: 'History', to: '/history' },
        { label: 'Profile', to: '/profile' },
      ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to={homePath} className="navbar-brand">
          <span className="navbar-title">
            Fit<span className="navbar-dot">·</span>Mon
          </span>
        </Link>

        {/* Links */}
        <div className="navbar-links">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar-link${pathname === link.to ? ' is-active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="btn-secondary navbar-cta"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}