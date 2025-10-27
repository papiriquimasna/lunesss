# 🚀 ML Platform - Guía de Despliegue

## 📋 Resumen del Proyecto
Plataforma completa de Machine Learning con:
- **Backend**: Django + Django REST Framework
- **Frontend**: React + TypeScript + Vite
- **Funcionalidades**: Upload, Limpieza, Entrenamiento, Predicciones, Estadísticas

---

## 🔧 **BACKEND - Despliegue en Render**

### 1️⃣ Preparar Repositorio
```bash
git add .
git commit -m "Deploy ready"
git push origin main
```

### 2️⃣ Crear Servicio en Render
1. Ve a **[render.com](https://render.com)** → Sign Up/Login
2. Click **"New +"** → **"Web Service"**
3. Conecta tu repositorio de GitHub
4. Configuración:
   - **Name**: `ml-platform-backend`
   - **Root Directory**: `BackendSito`
   - **Environment**: `Python 3`
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn core.wsgi:application`

### 3️⃣ Variables de Entorno en Render
```
DEBUG=False
SECRET_KEY=tu-clave-secreta-aqui
```

### 4️⃣ Deploy
- Click **"Create Web Service"**
- Espera 5-10 minutos
- Copia la URL: `https://tu-app.onrender.com`

---

## ⚡ **FRONTEND - Despliegue en Vercel**

### 1️⃣ Preparar Variables
Edita `src/config/api.ts`:
```typescript
export const API_BASE_URL = 'https://tu-app.onrender.com/api';
```

### 2️⃣ Crear Proyecto en Vercel
1. Ve a **[vercel.com](https://vercel.com)** → Sign Up/Login
2. Click **"New Project"**
3. Import tu repositorio de GitHub
4. Configuración:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (raíz del proyecto)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3️⃣ Variables de Entorno en Vercel
```
VITE_API_BASE_URL=https://tu-app.onrender.com
```

### 4️⃣ Deploy
- Click **"Deploy"**
- Espera 2-3 minutos
- Copia la URL: `https://tu-app.vercel.app`

---

## 🔗 **CONFIGURAR CORS**

### Actualizar Backend
En `BackendSito/core/settings.py`, línea ~75:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://tu-app.vercel.app",  # ← Cambiar por tu URL real
]
```

### Redeploy Backend
- Ve a Render Dashboard
- Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## ✅ **Verificar Funcionamiento**

### Backend
- `https://tu-app.onrender.com/admin/` → Panel de administración
- `https://tu-app.onrender.com/api/` → API endpoints

### Frontend
- `https://tu-app.vercel.app` → Aplicación completa
- Probar login, upload, predicciones

---

## 🆘 **Solución de Problemas**

### Backend no funciona
1. Revisar logs en Render Dashboard
2. Verificar variables de entorno
3. Comprobar que `build.sh` tiene permisos

### Frontend no conecta
1. Verificar `VITE_API_BASE_URL` en Vercel
2. Comprobar CORS en Django
3. Revisar Network tab en DevTools

### CORS Error
1. Actualizar `CORS_ALLOWED_ORIGINS` en Django
2. Redeploy backend en Render
3. Esperar 2-3 minutos

---

## 📱 **URLs Finales**
- **Frontend**: https://tu-app.vercel.app
- **Backend**: https://tu-app.onrender.com
- **Admin**: https://tu-app.onrender.com/admin/

¡Tu plataforma ML está lista para producción! 🎉