import React from 'react';
import { useLocation } from 'react-router-dom';
import { Moon, Sun, Bell, Menu } from 'lucide-react';
import { useDateTime } from '../hooks/useDateTime';
import { useTheme } from '../providers/ThemeProvider';
import { cn } from '../lib/utils';

const getTitleFromPathname = (pathname: string) => {
  if (pathname === '/') return 'Inicio';
  const title = pathname.replace('/', '').replace(/-/g, ' ');
  return title.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { time, day } = useDateTime();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const title = getTitleFromPathname(location.pathname);

  return (
    <header className="flex items-center justify-between p-4 md:p-6 border-b">
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <div className="text-right hidden md:block">
          <p className="font-semibold text-foreground">{time}</p>
          <p className="text-sm text-muted-foreground">{day}</p>
        </div>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <button 
            onClick={() => setTheme('light')}
            className={cn(
              'p-2 rounded-md transition-colors',
              theme === 'light' || (theme === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches)
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sun className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setTheme('dark')}
            className={cn(
              'p-2 rounded-md transition-colors',
              theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Moon className="h-5 w-5" />
          </button>
        </div>
        <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
        </button>
      </div>
    </header>
  );
}
