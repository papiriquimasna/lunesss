import React, { useState } from 'react';
import { faker } from '@faker-js/faker';
import { Pencil, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';

const users = Array.from({ length: 5 }, () => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: faker.helpers.arrayElement(['Admin', 'Miembro']),
  avatar: faker.image.avatar(),
}));

type User = typeof users[0];

export function UsersSettings() {
  type ModalState = {
    type: 'create' | 'edit' | 'delete';
    user?: User;
  } | null;

  const [modalState, setModalState] = useState<ModalState>(null);

  const closeModal = () => setModalState(null);

  const renderModalContent = () => {
    if (!modalState) return null;

    switch (modalState.type) {
      case 'create':
      case 'edit':
        return (
          <form className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Nombre Completo</label>
              <input type="text" id="name" defaultValue={modalState.user?.name || ''} className="w-full bg-input rounded-md px-3 py-2 text-sm" autoFocus />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">Correo Electrónico</label>
              <input type="email" id="email" defaultValue={modalState.user?.email || ''} className="w-full bg-input rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-foreground mb-1">Rol</label>
              <select id="role" defaultValue={modalState.user?.role || 'Miembro'} className="w-full bg-input rounded-md px-3 py-2 text-sm appearance-none">
                <option>Admin</option>
                <option>Miembro</option>
              </select>
            </div>
          </form>
        );
      case 'delete':
        return (
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que quieres eliminar a <strong className="text-foreground">{modalState.user?.name}</strong>? Esta acción no se puede deshacer.
          </p>
        );
      default:
        return null;
    }
  };

  const renderModalFooter = () => {
    if (!modalState) return null;

    const cancelButton = (
        <button onClick={closeModal} className="bg-secondary text-secondary-foreground px-4 py-2 text-sm rounded-md font-semibold hover:bg-secondary/80">
            Cancelar
        </button>
    );

    switch (modalState.type) {
      case 'create':
        return <>{cancelButton}<button onClick={closeModal} className="bg-primary text-primary-foreground px-4 py-2 text-sm rounded-md font-semibold hover:bg-primary/90">Crear Usuario</button></>;
      case 'edit':
        return <>{cancelButton}<button onClick={closeModal} className="bg-primary text-primary-foreground px-4 py-2 text-sm rounded-md font-semibold hover:bg-primary/90">Guardar Cambios</button></>;
      case 'delete':
        return <>{cancelButton}<button onClick={closeModal} className="bg-destructive text-destructive-foreground px-4 py-2 text-sm rounded-md font-semibold hover:bg-destructive/90">Eliminar</button></>;
      default:
        return null;
    }
  };

  const getModalTitle = () => {
    if (!modalState) return '';
    switch (modalState.type) {
        case 'create': return 'Crear Nuevo Usuario';
        case 'edit': return `Editar Usuario`;
        case 'delete': return 'Confirmar Eliminación';
        default: return '';
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Gestión de Usuarios</h2>
            <p className="text-sm text-muted-foreground">
              Invita, gestiona y elimina usuarios de tu equipo.
            </p>
          </div>
          <button 
            onClick={() => setModalState({ type: 'create' })}
            className="bg-primary text-primary-foreground px-4 py-2 text-sm rounded-md font-semibold hover:bg-primary/90"
          >
            Crear Usuario
          </button>
        </div>

        <div className="bg-card rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left text-muted-foreground">
                  <th className="p-4 font-medium">Nombre</th>
                  <th className="p-4 font-medium">Correo Electrónico</th>
                  <th className="p-4 font-medium">Rol</th>
                  <th className="p-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id} className={`border-b ${index === users.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="p-4 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                        {user.name}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{user.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'Admin' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setModalState({ type: 'edit', user })} className="p-2 text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setModalState({ type: 'delete', user })} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Modal
        isOpen={!!modalState}
        onClose={closeModal}
        title={getModalTitle()}
        footer={renderModalFooter()}
      >
        {renderModalContent()}
      </Modal>
    </>
  );
}
