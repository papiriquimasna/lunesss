import { useState, useEffect } from 'react';
import { User, Mail, Upload, Trash2 } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

export function ProfileSettings() {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const getFullUrl = (url: string | null) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `http://localhost:8000${url}`;
  };

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const { data } = await axios.get(`${API_BASE_URL}/auth/profile/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
      });
      setAvatarPreview(getFullUrl(data.avatar_url));
      localStorage.setItem('user', JSON.stringify(data));
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('access_token');

      // Actualizar perfil
      await axios.patch(`${API_BASE_URL}/auth/profile/${user?.id}/`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Subir avatar si hay uno
      if (avatarFile) {
        const fd = new FormData();
        fd.append('avatar', avatarFile);
        await axios.post(`${API_BASE_URL}/auth/profile/avatar/upload/`, fd, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
      }

      await loadProfile();
      setMessage('Perfil actualizado exitosamente');
      setAvatarFile(null);
      window.dispatchEvent(new Event('userUpdated'));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm('¿Eliminar avatar?')) return;

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`${API_BASE_URL}/auth/profile/avatar/delete/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await loadProfile();
      setAvatarFile(null);
      setMessage('Avatar eliminado exitosamente');
      window.dispatchEvent(new Event('userUpdated'));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar avatar');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="text-center py-8">Cargando...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {message && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar */}
        <div className="lg:col-span-1">
          <div className="bg-card p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Foto de Perfil</h3>
            <div className="flex flex-col items-center">
              <div className="h-32 w-32 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center overflow-hidden mb-4 shadow-lg">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-primary">
                    {user.first_name[0]}{user.last_name[0]}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground text-center mb-4">
                JPG, PNG o GIF (máx. 5MB)
              </p>
              <div className="flex flex-col gap-2 w-full">
                <label className="cursor-pointer w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                  <Upload className="h-4 w-4" />
                  Subir nueva foto
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
                {avatarPreview && (
                  <button
                    onClick={handleDeleteAvatar}
                    className="w-full px-4 py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar foto
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-card p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-semibold mb-6">Información Personal</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                      placeholder="Juan"
                      className="w-full pl-10 pr-4 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Apellido *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                      placeholder="Pérez"
                      className="w-full pl-10 pr-4 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Correo Electrónico *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="correo@ejemplo.com"
                    className="w-full pl-10 pr-4 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Este correo se usará para iniciar sesión
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    loadProfile();
                    setAvatarFile(null);
                  }}
                  className="px-6 py-3 border rounded-lg hover:bg-accent transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
