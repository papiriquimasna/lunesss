import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  Sparkles,
  BrainCircuit,
  BarChart3,
  LineChart,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shapes,
  Database,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const navGroups = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/', badge: null },
    ],
  },
  {
    label: 'Datos',
    items: [
      { name: 'Cargar Datos', icon: UploadCloud, path: '/upload', badge: null },
      { name: 'Almacén', icon: Database, path: '/storage', badge: null },
      { name: 'Limpieza', icon: Sparkles, path: '/cleaning', badge: null },
    ],
  },
  {
    label: 'Modelos',
    items: [
      { name: 'Entrenamiento', icon: BrainCircuit, path: '/training', badge: null },
      { name: 'Predicciones', icon: BarChart3, path: '/predictions', badge: null },
      { name: 'Estadísticas', icon: LineChart, path: '/statistics', badge: null },
    ],
  },
];

const NavItem = ({
  item,
  isCollapsed,
  onClick
}: {
  item: { name: string; icon: any; path: string; badge: string | null },
  isCollapsed: boolean,
  onClick: () => void
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group',
          isActive
            ? 'bg-primary text-primary-foreground font-medium'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          isCollapsed ? 'justify-center px-2' : ''
        )
      }
    >
      <>
        <item.icon className="h-4 w-4 shrink-0" />
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex items-center justify-between flex-1 overflow-hidden"
            >
              <span className="whitespace-nowrap text-sm">{item.name}</span>
              {item.badge && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {item.badge}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isCollapsed && isHovered && (
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-full ml-2 px-3 py-1.5 bg-popover border rounded-md text-sm text-popover-foreground shadow-md whitespace-nowrap z-50"
            >
              {item.name}
              {item.badge && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    </NavLink>
  );
};

interface SidebarProps {
  isCollapsed: boolean;
  isMobile?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}

export function Sidebar({ isCollapsed, isMobile = false, onToggleCollapse, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Cargar usuario del localStorage
    const loadUser = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch (error) {
          console.error('Error al cargar usuario:', error);
        }
      }
    };

    loadUser();

    // Escuchar evento de actualización de usuario
    window.addEventListener('userUpdated', loadUser);
    
    return () => {
      window.removeEventListener('userUpdated', loadUser);
    };
  }, []);

  const handleNavItemClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    // Limpiar localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    // Redirigir al login
    navigate('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? '4.5rem' : '16rem' }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col h-full border-r"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-16 border-b relative">
        <div className={cn('flex items-center gap-2', isCollapsed && 'mx-auto')}>
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Shapes className="h-5 w-5 text-primary-foreground" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <h1 className="font-semibold text-sm whitespace-nowrap">ML Platform</h1>
                <p className="text-xs text-muted-foreground whitespace-nowrap">v1.0.0</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!isMobile && onToggleCollapse && !isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="h-7 w-7 rounded-md border bg-background hover:bg-accent transition-colors flex items-center justify-center shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {!isMobile && onToggleCollapse && isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border bg-background hover:bg-accent transition-colors flex items-center justify-center z-10 shadow-sm"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* User Profile */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="p-4 border-b"
          >
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mb-4">
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8000${user.avatar_url}`}
                    alt={user.first_name} 
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-primary">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-sm text-foreground">
                {user?.first_name} {user?.last_name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Administrador</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        <nav className="px-3 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h4 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </h4>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavItem key={item.name} item={item} isCollapsed={isCollapsed} onClick={handleNavItemClick} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-3 border-t space-y-1">
        <NavLink
          to="/settings"
          onClick={handleNavItemClick}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              isCollapsed ? 'justify-center px-2' : ''
            )
          }
        >
          <Settings className="h-4 w-4 shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm whitespace-nowrap"
              >
                Ajustes
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200',
            isCollapsed ? 'justify-center px-2' : ''
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm whitespace-nowrap"
              >
                Cerrar sesión
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
