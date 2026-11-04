# Resultados de ejecución — Casos de prueba EP3 (CP-01 a CP-12)

Fecha de ejecución: 2026-11-03 / 2026-11-04
Aplicación bajo prueba: Atlas ET (backend + frontend + PostgreSQL en Docker)

## 1. Entorno y comandos

| Elemento | Valor |
| --- | --- |
| Backend | `http://localhost:4451` |
| Frontend | `http://localhost:3351` |
| PostgreSQL | `localhost:15433` (volumen persistente `postgres_data`) |
| Node.js | v24.21.0 |
| npm | 11.19.0 |
| Playwright | 1.64.1 (canal `msedge`, Edge instalado en el equipo) |
| Datos de prueba | usuarios, empresas, clientes y contratos creados por la propia suite vía API |

Comandos (desde la raíz del repositorio):

```powershell
# Levantar la aplicación
docker compose -f docker-compose.yml up -d --build

# Requisitos de la suite E2E (una sola vez)
npm --prefix tests install

# Ejecutar todo
npm test

# O por separado
npm run test:api                                  # 66 subpruebas, node:test
npm --prefix tests run test:e2e                   # 5 pruebas, Playwright + Edge
```

Artefactos generados (ignorados por Git):

- `tests/results/api-run.log`: salida completa de la suite API.
- `tests/results/e2e-run.log`: salida completa de Playwright.
- `tests/results/npm-test.log`: salida consolidada de `npm test` (ambas suites).
- `tests/results/html/`: reporte HTML de Playwright.
- `tests/e2e/screenshots/`: capturas de login, inicio y módulos en 3 viewports.
- `tests/test-results/`: capturas, contexto de error y trazas de las pruebas E2E fallidas.

## 2. Resumen general

| Suite | Pruebas | Aprobadas | Fallidas |
| --- | ---: | ---: | ---: |
| API (`node:test`) | 66 | 38 | 28 |
| E2E (`Playwright`) | 5 | 3 | 2 |
| **Total** | **71** | **41** | **30** |

| CP | Caso | Resultado | Subpruebas aprobadas |
| --- | --- | --- | ---: |
| CP-01 | Inicio de sesión válido | ✅ APROBADO | 3/3 |
| CP-02 | Rechazo de credenciales inválidas | ✅ APROBADO | 3/3 |
| CP-03 | Validación de registro | ❌ FALLIDO | 2/3 |
| CP-04 | Aislamiento por empresa | ❌ FALLIDO | 2/6 |
| CP-05 | Restricción por rol | ❌ FALLIDO | 1/4 |
| CP-06 | CRUD de cliente | ❌ FALLIDO | 5/6 |
| CP-07 | CRUD de contrato | ❌ FALLIDO | 4/7 |
| CP-08 | Documento contractual | ❌ FALLIDO | 3/8 |
| CP-09 | Enlace compartido protegido | ✅ APROBADO | 7/7 |
| CP-10 | Auditoría | ❌ FALLIDO | 2/4 |
| CP-11 | Errores y sesión expirada | ❌ FALLIDO | 3/4 API + 1/2 E2E |
| CP-12 | Responsive y usabilidad | ❌ FALLIDO | 2/3 viewports |

**Resultado global: 3 casos aprobados (CP-01, CP-02, CP-09) y 9 casos fallidos.**

## 3. Evidencia por caso

### CP-01 — Inicio de sesión válido — ✅ APROBADO

| Subprueba | Resultado |
| --- | --- |
| Responde HTTP 200 con token | ✅ |
| El token incluye identidad y empresa (`usuarioId`, `empresaId`, `nombreUsuario`, `rolNombre`) | ✅ |
| El token es aceptado y `/usuarios` no expone `contrasena_hash` | ✅ |

### CP-02 — Rechazo de credenciales inválidas — ✅ APROBADO

| Subprueba | Resultado |
| --- | --- |
| Contraseña incorrecta devuelve 401 sin token | ✅ |
| Usuario inexistente devuelve 401 sin token | ✅ |
| Ambos casos devuelven el mismo mensaje genérico | ✅ |

### CP-03 — Validación de registro — ❌ FALLIDO

| Subprueba | Resultado |
| --- | --- |
| Registro sin correo devuelve 400 con detalles | ✅ |
| Nombre de usuario demasiado corto devuelve 400 | ✅ |
| Correo duplicado devuelve 400 y no persiste el registro | ❌ |

Evidencia del fallo:

```text
POST /empresas  -> 500
{"error":"Error al crear empresa con usuario",
 "glosa":"duplicate key value violates unique constraint \"usuarios_correo_key\""}
```

Esperado: `400` con mensaje de validación. Observado: error de base de datos propagado como `500`.
El usuario con correo duplicado no queda persistido (la transacción revierte), pero el contrato HTTP es incorrecto.

Referencia: `BACKEND/src/routes/empresas.js` (manejo del error de unicidad en la creación empresa+usuario).

### CP-04 — Aislamiento por empresa — ❌ FALLIDO

| Subprueba | Resultado |
| --- | --- |
| Cliente de otra empresa: lectura 403/404 | ✅ |
| Cliente de otra empresa: modificación 403/404 y sin cambios | ✅ |
| Contrato de otra empresa: lectura 403/404 | ❌ devuelve `200` con el contrato de B |
| Archivos de contrato de otra empresa: lectura 403/404 | ❌ devuelve `200 []` |
| No se puede crear un contrato sobre un cliente de otra empresa | ❌ devuelve `201` |
| No se puede eliminar un contrato de otra empresa | ❌ devuelve `200 {"deleted":true}` y el contrato B desaparece |

Evidencia representativa:

```text
GET  /contratos/<id de B>        con token A -> 200
GET  /contratos/<id de B>/files  con token A -> 200 []
POST /contratos {cliente_id de B} con token A -> 201
DELETE /contratos/<id de B>      con token A -> 200 {"deleted":true}
GET  /contratos/<id de B>        con token B -> 404  (fue eliminado)
```

Causa: `GET /contratos/:id` (`BACKEND/src/routes/contracts.js:263`) y
`GET /contratos/:id/files` (`:404`) no verifican autenticación ni `empresa_id`;
`DELETE /contratos/:id` (`:534`) elimina solo por `id`. La creación tampoco valida
que el `cliente_id` pertenezca a la empresa del token.

### CP-05 — Restricción por rol — ❌ FALLIDO

| Subprueba | Resultado |
| --- | --- |
| Administrador puede crear usuarios | ✅ |
| Editor no puede crear usuarios | ❌ `201` |
| Editor no puede gestionar roles (asignar administrador) | ❌ `201` |
| Editor no puede eliminar usuarios | ❌ `200 {"deleted":true}` |

Evidencia: con el token del usuario `editor`, `POST /usuarios` crea un usuario,
`POST /empresa-usuarios` lo asigna al rol `1` (administrador) y
`DELETE /usuarios/:id` elimina usuarios correctamente. No se evalúa `rol_id`/`rolNombre`.

Referencias: `BACKEND/src/routes/users.js` (sin chequeo de rol) y
`BACKEND/src/routes/empresa_usuarios.js` (solo valida token y empresa).

### CP-06 — CRUD de cliente — ❌ FALLIDO

| Subprueba | Resultado |
| --- | --- |
| Crear cliente devuelve 201 y queda asociado a la empresa | ✅ |
| Listar clientes incluye el cliente creado | ✅ |
| Editar teléfono devuelve 200 y persiste | ✅ |
| Correo duplicado se rechaza con 400/409 | ❌ devuelve `500` |
| Validaciones activas: correo inválido y campos faltantes devuelven 400 | ✅ |
| Eliminar cliente devuelve 200/204 y luego 404 | ✅ |

Evidencia del fallo:

```text
POST /clientes (correo ya existente) -> 500
{"error":"Error al crear cliente",
 "glosa":"duplicate key value violates unique constraint \"clientes_correo_key\""}
```

Referencia: `BACKEND/src/routes/clients.js:112`.

### CP-07 — CRUD de contrato — ❌ FALLIDO

| Subprueba | Resultado |
| --- | --- |
| Crear contrato devuelve 201 y queda asociado al cliente | ✅ |
| Consultar detalle devuelve 200 | ✅ |
| Editar descripción devuelve 200 y persiste | ✅ |
| Fecha fin anterior a la de inicio se rechaza con 400 | ✅ |
| No se puede asociar un contrato a un cliente de otra empresa | ❌ `201` |
| No se puede reasignar un contrato a un cliente de otra empresa | ❌ `200` |
| Cliente inexistente se rechaza con 400/404 | ❌ `500` |

Evidencia:

```text
POST /contratos {cliente_id: <cliente de B>}   con token A -> 201
PUT  /contratos/<id> {cliente_id: <cliente de B>} con token A -> 200
POST /contratos {cliente_id: 999999999}         con token A -> 500
{"error":"Error al crear contrato",
 "glosa":"insert or update on table \"contratos\" violates foreign key constraint \"contratos_cliente_id_fkey\""}
```

Referencias: `BACKEND/src/routes/contracts.js:27` (creación sin validar empresa del cliente)
y `:317` (reasignación de `cliente_id` sin validar pertenencia).

### CP-08 — Documento contractual — ❌ FALLIDO

| Subprueba | Resultado |
| --- | --- |
| Subir un PDF válido responde 200/201 | ✅ |
| Listar archivos devuelve el documento cargado | ✅ |
| Descargar el documento devuelve contenido y tipo correcto | ✅ |
| Sin token no se puede listar archivos | ❌ devuelve `200` con el listado |
| Sin token no se puede descargar el documento | ❌ devuelve `200 application/pdf` con el contenido |
| Un usuario de otra empresa no puede listar los archivos | ❌ devuelve `200` |
| Extensión no permitida se rechaza | ❌ `.exe` devuelve `200` |
| Archivo mayor a 10 MB se rechaza con error controlado | ❌ devuelve `500` HTML (`Internal Server Error`) |

Evidencia:

```text
GET /contratos/<id>/files              sin token        -> 200 [{"id":"6","nombre_archivo":"contrato.pdf",...}]
GET /contratos/<id>/file/<fileId>      sin token        -> 200 application/pdf (9 bytes)
GET /contratos/<id>/files              token de B       -> 200
PUT /contratos/<id>  malware.exe                          -> 200
PUT /contratos/<id>  archivo de 11 MB                     -> 500 text/html "<pre>Internal Server Error</pre>"
```

Referencias: `BACKEND/src/routes/contracts.js:404` y `:421` (sin autenticación ni filtro por empresa),
más `multer` configurado solo con `limits.fileSize` (`:14`) sin `fileFilter` ni manejador del error `LIMIT_FILE_SIZE`.

### CP-09 — Enlace compartido protegido — ✅ APROBADO

| Subprueba | Resultado |
| --- | --- |
| Otra empresa no puede generar el enlace (403/404) | ✅ |
| Token de 64 caracteres hexadecimales | ✅ |
| Verificar sin contraseña devuelve 400 | ✅ |
| Verificar con contraseña errónea devuelve 401 | ✅ |
| Verificar con contraseña válida devuelve solo datos permitidos | ✅ |
| Listar archivos públicos exige contraseña | ✅ |
| Revocar el enlace invalida el acceso | ✅ |

### CP-10 — Auditoría — ❌ FALLIDO

| Subprueba | Resultado |
| --- | --- |
| Crear, editar y eliminar dejan registro con usuario, acción y fecha | ✅ |
| La auditoría de una empresa no muestra acciones de otra | ✅ |
| No se puede insertar auditoría sin autenticación | ❌ devuelve `500` |
| Un usuario autenticado no puede forjar entradas de auditoría | ❌ un editor inserta y obtiene `201` |

Evidencia:

```text
POST /auditoria sin token -> 500
{"error":"Error al registrar log",
 "glosa":"null value in column \"usuario_id\" of relation \"auditoria\" violates not-null constraint"}

POST /auditoria con token de editor -> 201
{"id":"84","usuario_id":"qa_editor_...","accion":"AUDITORIA_FORJADA_...: registro insertado por un editor",
 "fecha_hora":"2026-11-03T20:22:59.848Z"}
```

Esperado: `401/403` (auditoría de solo lectura para clientes). Observado: sin sesión devuelve
`500` y cualquier usuario autenticado puede insertar entradas arbitrarias. Esto permite
falsificar o contaminar la traza de auditoría.

Referencia: `BACKEND/src/routes/audit.js:19`.

### CP-11 — Errores y sesión expirada — ❌ FALLIDO

| Subprueba | Resultado |
| --- | --- |
| Sin `Authorization` devuelve 401 sin stack trace | ✅ |
| `Bearer` inválido devuelve 401 sin stack trace | ✅ |
| Token expirado devuelve 401 | ✅ |
| No se expone la versión de Express | ❌ cabecera `X-Powered-By: Express` |
| E2E: sin token redirige a `/login` | ✅ |
| E2E: con token expirado redirige a `/login` | ❌ permanece en `http://localhost:3351/home` |

Evidencia del E2E:

```text
Expected pattern: /\/login/
Received string:  "http://localhost:3351/home"
```

Captura: `tests/e2e/screenshots/CP-11-token-expirado.png`.
Trazas: `tests/test-results/cp11-sesion-.../`.

Referencias: `BACKEND/src/app.js` (no se desactiva `x-powered-by`) y
`FRONTEND/src/lib/api.jsx` / `FRONTEND/src/context/AuthContext.jsx` (el interceptor no cierra
sesión ni redirige al recibir 401 en una carga de datos).

### CP-12 — Responsive y usabilidad — ❌ FALLIDO

| Viewport | Resultado |
| --- | --- |
| Desktop 1366×768 | ✅ |
| Tablet 768×1024 | ✅ |
| Mobile 390×844 | ❌ 7 problemas detectados |

Evidencia del viewport móvil 390×844:

- Menú lateral de 240 px: 61,5 % del ancho (máximo aceptado 50 %).
- Área de contenido de 150 px: 38,5 % del ancho (mínimo aceptado 50 %).
- 4 tarjetas de métricas de 13,8 px de ancho (mínimo esperado 100 px).
- Títulos principales fuera del viewport:
  - `/clientes`: `right=398,7 px`
  - `/contratos`: `right=418,9 px`
  - `/auditoria`: `right=412,0 px`
  - `/usuarios`: `right=405,2 px`

Capturas: `tests/e2e/screenshots/mobile-390x844-*.png`.
Trazas: `tests/test-results/cp12-responsive-.../`.

Referencias: `FRONTEND/src/components/Layout.jsx` (`drawerWidth = 240` fijo, sin variante
temporal para móvil) y `FRONTEND/src/pages/Home.jsx` (tarjetas de métricas sin `flexWrap`
o ancho mínimo responsive).

## 4. Hallazgos consolidados

| # | Hallazgo | Severidad | Casos | Evidencia |
| --- | --- | --- | --- | --- |
| 1 | Contratos y documentos sin aislamiento por empresa (lectura, listado de archivos, creación, reasignación y borrado) | Crítica | CP-04, CP-07 | `200/201` cruzados; borrado efectivo de datos de otra empresa |
| 2 | Endpoints de documentos sin autenticación | Alta | CP-08 | `GET /files` y `GET /file/:id` sin token devuelven `200` |
| 3 | Sin control de rol: un editor crea usuarios, asigna administradores y elimina usuarios | Crítica | CP-05 | `201`, `201`, `200` con token de editor |
| 4 | Auditoría insertable por cualquier usuario autenticado | Alta | CP-10 | `201` con `AUDITORIA_FORJADA` y token de editor |
| 5 | Errores de unicidad y de clave foránea expuestos como `500` | Media | CP-03, CP-06, CP-07 | `duplicate key...`, `violates foreign key constraint...` |
| 6 | Carga de archivos sin validación de extensión ni manejo del límite de tamaño | Alta | CP-08 | `.exe` aceptado; 11 MB devuelve `500` HTML |
| 7 | El frontend no cierra sesión ni redirige ante token expirado | Media | CP-11 | URL final `/home` |
| 8 | Cabecera `X-Powered-By: Express` expuesta | Baja | CP-11 | `X-Powered-By: Express` |
| 9 | Layout no responsive en móvil | Media | CP-12 | Drawer 61,5 %, contenido 38,5 %, tarjetas 13,8 px |

## 5. Notas de ejecución

- `npm test` ejecuta la suite API y luego la E2E aunque la primera tenga fallos, y devuelve
  código de salida 1 cuando algún caso falla. Los fallos son hallazgos de la aplicación, no
  errores de la suite.
- Las pruebas no modifican código de producción ni acceden directamente a la base de datos:
  toda la preparación se hace mediante la API pública.
- Cada ejecución usa identificadores únicos (`RUN_ID`), por lo que puede repetirse sin
  colisiones. No se implementó limpieza: los datos de prueba se acumulan en el volumen
  persistente `postgres_data` (empresas, usuarios, clientes, contratos y auditoría).
- `tests/e2e/screenshots/`, `tests/results/` y `tests/test-results/` están ignorados por Git.
- Los casos CP-01, CP-02 y CP-09 se consideran aprobados; el resto requiere corrección y
  nueva ejecución. Al corregir los hallazgos, los mismos tests deben pasar sin cambios.
