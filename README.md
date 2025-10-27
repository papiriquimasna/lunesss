# 🚀 ML Platform - Guía de Despliegue

## 📋 Estructura del Proyecto
```
📁 Proyecto/
├── 📁 frontend/          # React + TypeScript + Vite
│   ├── src/
│   ├── package.json
│   ├── vercel.json
│   └── ...
├── 📁 BackendSito/       # Django + Django REST Framework
│   ├── core/
│   ├── datasets/
│   ├── ml_training/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── ...
└── 📄 README.md
```

## 🎯 Funcionalidades
- **Upload**: Subir datasets CSV
- **Limpieza**: Procesar y limpiar datos
- **Entrenamiento**: Crear modelos ML
- **Predicciones**: 5 tipos predefinidos (salario, edad, rendimiento, etc.)
- **Estadísticas**: Dashboard con métricas reales

---

## 🔧 **BACKEND - Despliegue en Render**

### 1️⃣ Crear Servicio en Render
1. Ve a **[render.com](https://render.com)** → Sign Up/Login
2. Click **"New +"** → **"Web Service"**
3. Conecta tu repositorio: `https://github.com/papiriquimasna/lunesss`
4. Configuración:
   - **Name**: `ml-platform-backend`
   - **Root Directory**: `BackendSito`
   - **Environment**: `Python 3`
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn core.wsgi:application`

### 2️⃣ Variables de Entorno en Render
```
DEBUG=False
SECRET_KEY=django-insecure-genera-una-clave-secreta-aqui
```

### 3️⃣ Deploy Backend
- Click **"Create Web Service"**
- Espera 5-10 minutos
- Copia la URL: `https://tu-backend.onrender.com`

---

## ⚡ **FRONTEND - Despliegue en Vercel**

### 1️⃣ Crear Proyecto en Vercel
1. Ve a **[vercel.com](https://vercel.com)** → Sign Up/Login
2. Click **"New Project"**
3. Import repositorio: `https://github.com/papiriquimasna/lunesss`
4. Configuración:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2️⃣ Variables de Entorno en Vercel
```
VITE_API_BASE_URL=https://tu-backend.onrender.com
```

### 3️⃣ Deploy Frontend
- Click **"Deploy"**
- Espera 2-3 minutos
- Copia la URL: `https://tu-frontend.vercel.app`

---

## 🔗 **CONFIGURAR CORS (IMPORTANTE)**

### 1️⃣ Actualizar Backend
En `BackendSito/core/settings.py`, línea ~75:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://tu-frontend.vercel.app",  # ← Cambiar por tu URL real de Vercel
]
```

### 2️⃣ Redeploy Backend
- Ve a Render Dashboard
- Click **"Manual Deploy"** → **"Deploy latest commit"**
- Espera 3-5 minutos

---

## ✅ **Verificar Funcionamiento**

### Backend ✓
- `https://tu-backend.onrender.com/admin/` → Panel Django
- `https://tu-backend.onrender.com/api/auth/register/` → API funcionando

### Frontend ✓
- `https://tu-frontend.vercel.app` → Aplicación completa
- Probar: Registro → Login → Upload → Predicciones

---

## 🆘 **Solución de Problemas**

### ❌ Backend no inicia
1. **Revisar logs** en Render Dashboard
2. **Verificar** `SECRET_KEY` en variables de entorno
3. **Comprobar** que `build.sh` se ejecutó correctamente

### ❌ Frontend no conecta al Backend
1. **Verificar** `VITE_API_BASE_URL` en Vercel
2. **Actualizar** CORS en Django settings
3. **Redeploy** backend después de cambiar CORS

### ❌ Error CORS
```
Access to fetch at 'https://backend.onrender.com' from origin 'https://frontend.vercel.app' has been blocked by CORS policy
```
**Solución**: Agregar tu dominio de Vercel a `CORS_ALLOWED_ORIGINS` y redeploy backend

---

## 🎉 **URLs Finales**
- **🌐 Frontend**: https://tu-frontend.vercel.app
- **🔧 Backend**: https://tu-backend.onrender.com
- **⚙️ Admin Django**: https://tu-backend.onrender.com/admin/

## 📱 **Funcionalidades Listas**
- ✅ Sistema de autenticación completo
- ✅ Upload y gestión de datasets
- ✅ Limpieza de datos con múltiples opciones
- ✅ Entrenamiento de modelos ML
- ✅ 5 tipos de predicciones predefinidas
- ✅ Dashboard con estadísticas reales
- ✅ Interfaz responsive y profesional

¡Tu plataforma ML está lista para producción! 🚀