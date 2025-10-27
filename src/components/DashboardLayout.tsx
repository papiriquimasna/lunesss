import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { AnimatePresence, motion } from 'framer-motion';
import { ChatWidget } from './ChatWidget';

export function DashboardLayout() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleToggleDesktopCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {isDesktop ? (
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleDesktopCollapse}
        />
      ) : (
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 z-30"
                onClick={handleToggleMobileMenu}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed top-0 left-0 h-full z-40"
              >
                <Sidebar
                  isCollapsed={false}
                  isMobile={true}
                  onClose={handleToggleMobileMenu}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={handleToggleMobileMenu} />
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
      <ChatWidget />
    </div>
  );
}
