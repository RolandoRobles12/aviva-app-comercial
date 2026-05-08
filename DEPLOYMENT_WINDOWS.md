# Deployment en Windows/PowerShell

## Deploy rápido

```powershell
firebase deploy                    # hosting + functions + rules
firebase deploy --only hosting     # solo panel web
firebase deploy --only functions   # solo Cloud Functions
```

## Deploy manual (con builds previos)

```powershell
cd admin && npm run build && cd ..
cd functions && npm run build && cd ..
firebase deploy
```

## Verificación post-deploy

```powershell
firebase hosting:channel:list      # URL del panel
firebase functions:list            # estado de cada función
firebase functions:log             # logs recientes
```

## Troubleshooting

**"El término './deploy-all.sh' no se reconoce"**: Usar Firebase CLI directamente o el script PowerShell:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\deploy-all.ps1
```

**"firestore.indexes.json does not exist"**:
```powershell
# Opción 1: obtener el archivo actualizado
git pull

# Opción 2: crear vacío
@"{"indexes": [], "fieldOverrides": []}"@ | Out-File -FilePath firestore.indexes.json -Encoding utf8
```

**Panel no carga tras deploy**: Limpiar caché del navegador (`Ctrl+F5`) o verificar en incógnito.

**Functions no responden**:
```powershell
firebase functions:list
firebase functions:log
firebase deploy --only functions
```

## Gestión de configuración de Functions

```powershell
firebase functions:config:get
firebase functions:config:set hubspot.apikey="..."
firebase deploy --only functions   # necesario tras cambiar config
```

## Checklist

- [ ] `git pull` para tener el código actualizado
- [ ] `cd admin && npm run build`
- [ ] `cd functions && npm run build`
- [ ] `firebase deploy`
- [ ] Panel verificado en navegador
- [ ] `firebase functions:list` — todas en estado `ACTIVE`
- [ ] `firebase functions:log` — sin errores
