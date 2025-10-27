import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { ProfileSettings } from '../components/settings/ProfileSettings';
import { UsersSettings } from '../components/settings/UsersSettings';

const tabs = ['Perfil', 'Usuarios'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Ajustes</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona la configuración de tu cuenta y de la plataforma.
        </p>
      </div>
      
      <div className="flex border-b">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'Perfil' && <ProfileSettings />}
        {activeTab === 'Usuarios' && <UsersSettings />}
      </div>
    </div>
  );
}
