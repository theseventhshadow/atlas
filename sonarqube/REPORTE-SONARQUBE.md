# Reporte de análisis estático — SonarQube

Documento generado automáticamente a partir de la API de SonarQube (`/api/measures`, `/api/issues`, `/api/hotspots`, `/api/qualitygates`).
Reproduce exactamente el estado publicado en el servidor en la fecha indicada.

| Campo | Valor |
|---|---|
| Proyecto | `caso-a-backend` |
| Servidor SonarQube | 9.9.8.100196 (http://localhost:9000) |
| Dashboard | http://localhost:9000/dashboard?id=caso-a-backend |
| SonarScanner | SonarScanner CLI 6.2.1.4610 (native, Windows x64) |
| Fecha de generación del reporte | 28-10-2026, 8:30:13 p. m. |
| Quality Gate | ✅ Pasado (OK) |
| Alcance analizado | `BACKEND/src`, `FRONTEND/src` (ver `sonar-project.properties`) |

## 1. Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Líneas de código (ncloc) | 10.244 |
| Archivos | 57 |
| Funciones | 372 |
| Complejidad ciclomática total | 1.082 |
| Complejidad cognitiva total | 637 |
| 🐞 Bugs | **1** |
| 🔒 Vulnerabilidades | **0** |
| 🧹 Code smells | **41** |
| ⚠️ Security hotspots | **3** |
| Deuda técnica total | 4h 47min |
| Ratio de deuda técnica | 0.1% |
| Duplicación | 16.6% (1.825 líneas) |
| Cobertura | 0.0% |

### Ratings (A = mejor, E = peor)

| Dimensión | Rating |
|---|---|
| Reliability (fiabilidad) | C (3) |
| Security (seguridad) | A (1) |
| Maintainability (mantenibilidad) | A (1) |

## 2. Issues por tipo y severidad

| Tipo | Total | Blocker | Critical | Major | Minor | Info |
|---|---|---|---|---|---|---|
| BUG | 1 | 0 | 0 | 1 | 0 | 0 |
| VULNERABILITY | 0 | 0 | 0 | 0 | 0 | 0 |
| CODE_SMELL | 41 | 0 | 5 | 24 | 11 | 1 |
| **TOTAL** | **42** | 0 | 5 | 25 | 11 | 1 |

Además hay **3 security hotspots** (no son vulnerabilidades confirmadas: requieren revisión manual).

## 3. Distribución de issues por archivo

| Archivo | Bugs | Code smells | Total |
|---|---|---|---|
| `FRONTEND/src/pages/contratos/ContratosTabList.jsx` | 0 | 10 | 10 |
| `FRONTEND/src/pages/clientes/ClientesTabList.jsx` | 0 | 5 | 5 |
| `FRONTEND/src/pages/usuarios/UsuariosTabList.jsx` | 0 | 4 | 4 |
| `BACKEND/src/routes/contracts.js` | 0 | 3 | 3 |
| `FRONTEND/src/pages/clientes/ClienteForm.jsx` | 0 | 3 | 3 |
| `FRONTEND/src/pages/contratos/ContratoCompartido.jsx` | 0 | 3 | 3 |
| `BACKEND/src/routes/users.js` | 0 | 2 | 2 |
| `FRONTEND/src/components/RoleGuard.jsx` | 0 | 2 | 2 |
| `FRONTEND/src/pages/clientes/ClientesTabCreate.jsx` | 0 | 2 | 2 |
| `FRONTEND/src/pages/contratos/ContratoForm.jsx` | 0 | 2 | 2 |
| `BACKEND/src/routes/empresas.js` | 0 | 1 | 1 |
| `FRONTEND/src/context/AuthContext.jsx` | 0 | 1 | 1 |
| `FRONTEND/src/index.css` | 1 | 0 | 1 |
| `FRONTEND/src/pages/auditoria/AuditoriaList.jsx` | 0 | 1 | 1 |
| `FRONTEND/src/pages/contratos/ContratosTabCreate.jsx` | 0 | 1 | 1 |
| `FRONTEND/src/pages/empresas/EmpresaForm.jsx` | 0 | 1 | 1 |

## 4. Code smells agrupados por regla

| Regla | Descripción | Issues | Severidad típica |
|---|---|---|---|
| `javascript:S6478` | React components should not be nested | 15 | MAJOR |
| `javascript:S1128` | Unnecessary imports should be removed | 6 | MINOR |
| `javascript:S3776` | Cognitive Complexity of functions should not be too high | 5 | CRITICAL |
| `javascript:S1481` | Unused local variables and functions should be removed | 5 | MINOR |
| `javascript:S1854` | Unused assignments should be removed | 5 | MAJOR |
| `javascript:S6479` | No array index for keys in JSX list components | 2 | MAJOR |
| `javascript:S4624` | Template literals should not be nested | 1 | MAJOR |
| `javascript:S1135` | Track uses of "TODO" tags | 1 | INFO |
| `javascript:S2681` | Multiline blocks should be enclosed in curly braces | 1 | MAJOR |

## 5. Detalle de bugs y vulnerabilidades

| Archivo | Línea | Tipo | Severidad | Regla | Mensaje |
|---|---|---|---|---|---|
| `FRONTEND/src/index.css` | 6 | BUG | MAJOR | `css:S4649` | Unexpected missing generic font family |

## 6. Detalle completo de code smells

| # | Archivo | Línea | Severidad | Regla | Mensaje |
|---|---|---|---|---|---|
| 1 | `BACKEND/src/routes/contracts.js` | 281 | CRITICAL | `javascript:S3776` | Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed. |
| 2 | `BACKEND/src/routes/contracts.js` | 357 | MINOR | `javascript:S1481` | Remove the declaration of the unused 'result' variable. |
| 3 | `BACKEND/src/routes/contracts.js` | 357 | MAJOR | `javascript:S1854` | Remove this useless assignment to variable "result". |
| 4 | `BACKEND/src/routes/empresas.js` | 25 | CRITICAL | `javascript:S3776` | Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed. |
| 5 | `BACKEND/src/routes/users.js` | 124 | CRITICAL | `javascript:S3776` | Refactor this function to reduce its Cognitive Complexity from 26 to the 15 allowed. |
| 6 | `BACKEND/src/routes/users.js` | 233 | MAJOR | `javascript:S4624` | Refactor this code to not use nested template literals. |
| 7 | `FRONTEND/src/components/RoleGuard.jsx` | 20 | MINOR | `javascript:S1481` | Remove the declaration of the unused 'location' variable. |
| 8 | `FRONTEND/src/components/RoleGuard.jsx` | 20 | MAJOR | `javascript:S1854` | Remove this useless assignment to variable "location". |
| 9 | `FRONTEND/src/context/AuthContext.jsx` | 49 | INFO | `javascript:S1135` | Complete the task associated to this "TODO" comment. |
| 10 | `FRONTEND/src/pages/auditoria/AuditoriaList.jsx` | 61 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “AuditoriaList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |
| 11 | `FRONTEND/src/pages/clientes/ClienteForm.jsx` | 6 | MINOR | `javascript:S1128` | Remove this unused import of 'FormControlLabel'. |
| 12 | `FRONTEND/src/pages/clientes/ClienteForm.jsx` | 8 | MINOR | `javascript:S1128` | Remove this unused import of 'Switch'. |
| 13 | `FRONTEND/src/pages/clientes/ClienteForm.jsx` | 89 | CRITICAL | `javascript:S3776` | Refactor this function to reduce its Cognitive Complexity from 29 to the 15 allowed. |
| 14 | `FRONTEND/src/pages/clientes/ClientesTabCreate.jsx` | 25 | MINOR | `javascript:S1481` | Remove the declaration of the unused 'role' variable. |
| 15 | `FRONTEND/src/pages/clientes/ClientesTabCreate.jsx` | 25 | MAJOR | `javascript:S1854` | Remove this useless assignment to variable "role". |
| 16 | `FRONTEND/src/pages/clientes/ClientesTabList.jsx` | 58 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “ClientesTabList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |
| 17 | `FRONTEND/src/pages/clientes/ClientesTabList.jsx` | 84 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “ClientesTabList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |
| 18 | `FRONTEND/src/pages/clientes/ClientesTabList.jsx` | 97 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “ClientesTabList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |
| 19 | `FRONTEND/src/pages/clientes/ClientesTabList.jsx` | 110 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “ClientesTabList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |
| 20 | `FRONTEND/src/pages/clientes/ClientesTabList.jsx` | 146 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “ClientesTabList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |
| 21 | `FRONTEND/src/pages/contratos/ContratoCompartido.jsx` | 1 | MINOR | `javascript:S1128` | Remove this unused import of 'useEffect'. |
| 22 | `FRONTEND/src/pages/contratos/ContratoCompartido.jsx` | 24 | MINOR | `javascript:S1481` | Remove the declaration of the unused 'navigate' variable. |
| 23 | `FRONTEND/src/pages/contratos/ContratoCompartido.jsx` | 24 | MAJOR | `javascript:S1854` | Remove this useless assignment to variable "navigate". |
| 24 | `FRONTEND/src/pages/contratos/ContratoForm.jsx` | 121 | CRITICAL | `javascript:S3776` | Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed. |
| 25 | `FRONTEND/src/pages/contratos/ContratoForm.jsx` | 664 | MAJOR | `javascript:S6479` | Do not use Array index in keys |
| 26 | `FRONTEND/src/pages/contratos/ContratosTabCreate.jsx` | 294 | MAJOR | `javascript:S6479` | Do not use Array index in keys |
| 27 | `FRONTEND/src/pages/contratos/ContratosTabList.jsx` | 8 | MINOR | `javascript:S1128` | Remove this unused import of 'MLink'. |
| 28 | `FRONTEND/src/pages/contratos/ContratosTabList.jsx` | 23 | MINOR | `javascript:S1128` | Remove this unused import of 'AttachFileIcon'. |
| 29 | `FRONTEND/src/pages/contratos/ContratosTabList.jsx` | 24 | MINOR | `javascript:S1128` | Remove this unused import of 'OpenInNewIcon'. |
| 30 | `FRONTEND/src/pages/contratos/ContratosTabList.jsx` | 35 | MINOR | `javascript:S1481` | Remove the declaration of the unused 'apiUrl' variable. |
| 31 | `FRONTEND/src/pages/contratos/ContratosTabList.jsx` | 35 | MAJOR | `javascript:S1854` | Remove this useless assignment to variable "apiUrl". |
| 32 | `FRONTEND/src/pages/contratos/ContratosTabList.jsx` | 101 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “ContratosTabList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |
| 33 | `FRONTEND/src/pages/contratos/ContratosTabList.jsx` | 132 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “ContratosTabList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |
| 34 | `FRONTEND/src/pages/contratos/ContratosTabList.jsx` | 145 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “ContratosTabList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |
| 35 | `FRONTEND/src/pages/contratos/ContratosTabList.jsx` | 158 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “ContratosTabList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |
| 36 | `FRONTEND/src/pages/contratos/ContratosTabList.jsx` | 173 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “ContratosTabList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |
| 37 | `FRONTEND/src/pages/empresas/EmpresaForm.jsx` | 51 | MAJOR | `javascript:S2681` | This statement will not be executed conditionally; only the first statement will be. The rest will execute unconditionally. |
| 38 | `FRONTEND/src/pages/usuarios/UsuariosTabList.jsx` | 53 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “UsuariosTabList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |
| 39 | `FRONTEND/src/pages/usuarios/UsuariosTabList.jsx` | 84 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “UsuariosTabList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |
| 40 | `FRONTEND/src/pages/usuarios/UsuariosTabList.jsx` | 94 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “UsuariosTabList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |
| 41 | `FRONTEND/src/pages/usuarios/UsuariosTabList.jsx` | 107 | MAJOR | `javascript:S6478` | Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “UsuariosTabList” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true. |

## 7. Security hotspots

| Archivo | Línea | Probabilidad | Categoría | Regla | Mensaje |
|---|---|---|---|---|---|
| `BACKEND/src/routes/contracts.js` | 13 | MEDIUM | dos | `javascript:S5693` | Make sure the content length limit is safe here. |
| `BACKEND/src/app.js` | 23 | LOW | insecure-conf | `javascript:S5122` | Make sure that enabling CORS is safe here. |
| `BACKEND/src/app.js` | 21 | LOW | others | `javascript:S5689` | Make sure disclosing the fingerprinting of this web technology is safe here. |

Los hotspots **no son hallazgos confirmados**: marcan código donde un humano debe decidir si el uso es seguro (revisar en *Security Hotspots* del proyecto y marcarlos como *Safe* o *Fixed*).

## 8. Cómo reproducir este análisis

```powershell
$env:SONAR_TOKEN = "<token>"
sonar-scanner
```

El token **no** se guarda en `sonar-project.properties`: SonarScanner CLI 6.x solo lo lee desde la variable de entorno `SONAR_TOKEN` (ver README).

## 9. Limitaciones del análisis

- **Cobertura 0%:** no se ejecutaron pruebas ni se entregó un reporte LCOV; el análisis es solo estático estructural.
- **Sin análisis de dependencias (SCA):** SonarQube 9.9 Community no detecta CVE en paquetes de `package.json`. Complementar con `npm audit`.
- **Sin análisis dinámico:** no se probó la aplicación en ejecución (ver *Análisis dinámico / DAST*).
- **Lógica de negocio y autorización:** SonarQube no valida si un usuario de una empresa accede a datos de otra; eso requiere pruebas funcionales de autorización.
- **Secreto expuesto fuera del alcance:** el análisis solo cubre `BACKEND/src` y `FRONTEND/src`; secretos en README/config no se auditan aquí.

## 10. Acciones recomendadas (priorizadas)

1. Corregir el bug de `FRONTEND/src/index.css:6` (familia genérica de fuente faltante).
2. Eliminar imports, variables y asignaciones sin uso (`S1128`, `S1481`, `S1854`): ~16 issues de bajo riesgo.
3. Resolver los componentes React anidados (`S6478`, 15 issues) extrayendo componentes al nivel de módulo.
4. Reducir complejidad cognitiva (`S3776`) en las funciones señaladas.
5. Revisar y resolver los security hotspots marcándolos *Safe*/*Fixed* con justificación.
6. Agregar pruebas y publicar cobertura (`sonar.javascript.lcov.reportPaths`) para que el indicador de cobertura sea real.
7. Sacar el `JWT_SECRET` del README y rotarlo.
