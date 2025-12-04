# Instrucciones para Desplegar Admin Actualizado

## El problema actual:

El admin que está en producción tiene código viejo. Los cambios que hice están en el repositorio pero NO están desplegados.

## Para desplegar el admin:

```bash
# Desde la carpeta raíz del proyecto
firebase deploy --only hosting
```

## Qué se arreglará después del deployment:

1. ✅ **Usuarios aparecerán en el autocomplete** - Cambié el query para buscar todos los usuarios (no solo role='seller')
2. ✅ **Kioscos aparecerán en el autocomplete** - El código ya estaba bien
3. ✅ **Ligas aparecerán** - El código ya estaba bien
4. ✅ **Editar metas funcionará** - Arreglé la conversión de períodos y tipos
5. ✅ **No más error de userId** - El código nuevo NO envía userId

## Cómo verificar que funcionó:

Después del deploy, abre la consola del navegador (F12) y ve a la pestaña "Console".

Deberías ver estos logs cuando cargas la página de Metas Comerciales:

```
✅ Usuarios cargados: X ["Nombre1 (role)", "Nombre2 (role)", ...]
✅ Kioscos cargados: X ["Kiosco1", "Kiosco2", ...]
✅ Ligas cargadas: X ["Liga1", "Liga2", ...]
```

Si ves 0 usuarios/kioscos/ligas, entonces hay un problema de permisos o datos.

## Si después del deploy todavía no aparecen usuarios:

Ejecuta este query en Firebase Console para verificar que existen usuarios:

1. Ve a Firebase Console
2. Firestore Database
3. Busca la colección "users"
4. Verifica que hay documentos con role diferente de "admin"

Si NO hay usuarios, entonces necesitamos crear usuarios primero.
