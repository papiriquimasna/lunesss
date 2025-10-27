# ⚡ Despliegue Rápido - 5 Pasos

## 🚀 **ESTRUCTURA DEL PROYECTO**
```
📁 Repositorio: https://github.com/papiriquimasna/lunesss
├── 📁 frontend/     ← React App (Vercel)
└── 📁 BackendSito/  ← Django API (Render)
```

## 🔥 **PASO A PASO (10 MINUTOS)**

### 1️⃣ Backend en Render
```
🌐 render.com → New Web Service
📂 Repo: https://github.com/papiriquimasna/lunesss
📁 Root Directory: BackendSito
🔨 Build: ./build.sh
▶️ Start: gunicorn core.wsgi:application
🔑 Variables: DEBUG=False, SECRET_KEY=clave-secreta
```

### 2️⃣ Frontend en Vercel
```
🌐 vercel.com → New Project
📂 Repo: https://github.com/papiriquimasna/lunesss
📁 Root Directory: frontend
⚡ Framework: Vite
🔑 Variables: VITE_API_BASE_URL=https://tu-backend.onrender.com
```

### 3️⃣ Configurar CORS
```python
# BackendSito/core/settings.py línea ~75
CORS_ALLOWED_ORIGINS = [
    "https://tu-frontend.vercel.app"  # ← Tu URL de Vercel
]
```

### 4️⃣ Redeploy Backend
```
Render Dashboard → Manual Deploy → Deploy latest commit
```

### 5️⃣ Probar
```
✅ Frontend: https://tu-frontend.vercel.app
✅ Backend: https://tu-backend.onrender.com/admin/
✅ Funcionalidad: Registro → Login → Upload → Predicciones
```

## 🎯 **URLs que necesitas cambiar:**
1. **Vercel URL** → Actualizar CORS en Django
2. **Render URL** → Configurar en variables de Vercel

## ✅ **¡Listo en 10 minutos!** 🚀