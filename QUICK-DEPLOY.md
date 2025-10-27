# ⚡ Despliegue Rápido - Comandos

## 🔥 **PASO A PASO RÁPIDO**

### 1. Subir a GitHub
```bash
git add .
git commit -m "Ready for production"
git push origin main
```

### 2. Backend en Render
```
1. render.com → New Web Service
2. Conectar GitHub repo
3. Root Directory: BackendSito
4. Build: ./build.sh
5. Start: gunicorn core.wsgi:application
6. Variables: DEBUG=False, SECRET_KEY=random-key
7. Deploy
```

### 3. Frontend en Vercel
```
1. vercel.com → New Project
2. Import GitHub repo
3. Framework: Vite
4. Variables: VITE_API_BASE_URL=https://tu-backend.onrender.com
5. Deploy
```

### 4. Configurar CORS
```python
# En BackendSito/core/settings.py
CORS_ALLOWED_ORIGINS = [
    "https://tu-frontend.vercel.app"
]
```

### 5. Redeploy Backend
```
Render Dashboard → Manual Deploy
```

## ✅ **Listo en 10 minutos!**