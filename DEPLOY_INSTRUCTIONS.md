# Instrucciones de Despliegue - Fix HubSpot Integration

## ⚠️ IMPORTANTE: Debes desplegar las Firebase Functions para que los cambios surtan efecto

La app Android **NO** necesita cambios. El código ya está correcto y listo para funcionar.

## Pasos para Desplegar

### 1. Autenticarse en Firebase
```bash
firebase login
```

### 2. Verificar el proyecto correcto
```bash
firebase use promotores-aviva-tu-negocio
```

### 3. Compilar las funciones
```bash
cd functions
npm run build
```

### 4. Desplegar solo las funciones (recomendado)
```bash
firebase deploy --only functions
```

### 5. Verificar que se desplegaron correctamente
Después del deploy, deberías ver URLs como:
```
✔  functions[getMyGoals(us-central1)]: Successful update operation
✔  functions[getMyLeagueStats(us-central1)]: Successful update operation
```

## ¿Por qué NO necesita cambios la app Android?

El código Android ya está perfectamente configurado:
- ✅ Llama correctamente a getMyGoals() con POST
- ✅ Llama correctamente a getMyLeagueStats() con POST  
- ✅ Los modelos de datos están alineados
- ✅ Maneja las respuestas correctamente

El problema estaba SOLO en las Firebase Functions que no podían encontrar 
el documento de usuario porque buscaban por document ID en lugar de por 
campo uid o email.

## Solución del Problema

**Problema**:
- Error "No HubSpot Owner ID configured for this user"
- Aunque el usuario SÍ tenía el HubSpot Owner ID configurado

**Causa**:
- Admin guardaba usuarios con IDs auto-generados y campo uid
- Functions buscaban por document ID = auth UID
- No encontraban el documento

**Solución**:
- Nuevo helper getUserDocument() que busca por ID, uid, y email
- Ahora encuentra correctamente todos los usuarios
