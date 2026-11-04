import { before, test } from "node:test";
import {
  API_URL,
  assert,
  assertStatusIn,
  bodyText,
  createClient,
  createCompany,
  createContract,
  decodeJwt,
  header,
  login,
  loginOk,
  makeClientPayload,
  makeContractPayload,
  request,
  signJwt,
  unique,
  uploadContractFile,
} from "./helpers.mjs";

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);

let ctx;

before(async () => {
  const health = await request("GET", "/");
  assert.equal(
    health.status,
    200,
    `El backend no responde en ${API_URL}. Levanta el stack con: docker compose up -d`
  );

  const companyA = await createCompany("a");
  const companyB = await createCompany("b");

  const tokenA = await loginOk(companyA);
  const tokenB = await loginOk(companyB);

  const clientA = await createClient(tokenA);
  const clientB = await createClient(tokenB);

  const contractB = await createContract(tokenB, clientB.id);
  const contractForFiles = await createContract(tokenA, clientA.id);
  const contractForShare = await createContract(tokenA, clientA.id);

  const editorUsername = unique("qa_editor").slice(0, 50);
  const editorPassword = "Editor123!";
  const editorCreate = await request("POST", "/empresa-usuarios", {
    token: tokenA,
    body: {
      nombre_usuario: editorUsername,
      contrasena_hash: editorPassword,
      correo: `${editorUsername}@example.test`,
      rol_id: 2,
    },
  });
  assert.equal(
    editorCreate.status,
    201,
    `No se pudo crear el usuario editor: ${editorCreate.status} ${bodyText(
      editorCreate
    )}`
  );

  const editorLogin = await login(editorUsername, editorPassword);
  assert.equal(
    editorLogin.status,
    200,
    `El usuario editor no puede iniciar sesión: ${editorLogin.status} ${bodyText(
      editorLogin
    )}`
  );

  ctx = {
    companyA,
    companyB,
    tokenA,
    tokenB,
    clientA,
    clientB,
    contractB,
    contractForFiles,
    contractForShare,
    editorUsername,
    editorPassword,
    tokenEditor: editorLogin.data.token,
  };
});

test("CP-01 - Inicio de sesión válido", async (t) => {
  const response = await login(ctx.companyA.username, ctx.companyA.password);

  await t.test("Responde HTTP 200 con token", () => {
    assert.equal(response.status, 200, bodyText(response));
    assert.ok(response.data.token, "La respuesta no contiene token");
  });

  await t.test("El token incluye identidad y empresa", () => {
    const payload = decodeJwt(response.data.token);
    assert.equal(Number(payload.usuarioId), ctx.companyA.usuarioId);
    assert.equal(Number(payload.empresaId), ctx.companyA.empresaId);
    assert.equal(payload.nombreUsuario, ctx.companyA.username);
    assert.ok(payload.rolNombre, "El token no incluye rolNombre");
  });

  await t.test("El token es aceptado y los datos no exponen la contraseña", async () => {
    const users = await request("GET", "/usuarios", { token: response.data.token });
    assert.equal(users.status, 200, bodyText(users));
    assert.ok(Array.isArray(users.data), "La respuesta de /usuarios no es una lista");
    for (const user of users.data) {
      assert.ok(
        !Object.prototype.hasOwnProperty.call(user, "contrasena_hash"),
        `El usuario ${user.nombre_usuario} expone contrasena_hash`
      );
    }
  });
});

test("CP-02 - Rechazo de credenciales inválidas", async (t) => {
  const wrongPassword = await login(ctx.companyA.username, "clave-incorrecta");
  const unknownUser = await login(`no_existe_${ctx.companyA.username}`, "clave-cualquiera");

  await t.test("Contraseña incorrecta devuelve 401", () => {
    assert.equal(wrongPassword.status, 401, bodyText(wrongPassword));
    assert.ok(!wrongPassword.data.token, "No debe emitirse token con clave incorrecta");
  });

  await t.test("Usuario inexistente devuelve 401", () => {
    assert.equal(unknownUser.status, 401, bodyText(unknownUser));
    assert.ok(!unknownUser.data.token, "No debe emitirse token para usuario inexistente");
  });

  await t.test("El mensaje es genérico y no revela si el usuario existe", () => {
    assert.equal(
      wrongPassword.data.error,
      unknownUser.data.error,
      "Los mensajes permiten distinguir usuario existente de inexistente"
    );
  });
});

test("CP-03 - Validación de registro", async (t) => {
  const baseUser = {
    nombre_usuario: unique("qa_reg").slice(0, 50),
    contrasena_hash: "Registro123!",
    correo: `${unique("qa_reg")}@example.test`,
  };

  await t.test("Registro sin correo devuelve 400", async () => {
    const response = await request("POST", "/empresas", {
      body: {
        usuario: {
          nombre_usuario: baseUser.nombre_usuario,
          contrasena_hash: baseUser.contrasena_hash,
        },
        empresa: {
          nombre: `QA sin correo ${ctx.companyA.empresaId}`,
          correo: `sin_correo_${unique("emp")}@example.test`,
        },
      },
    });
    assert.equal(response.status, 400, bodyText(response));
    assert.ok(Array.isArray(response.data.detalles) && response.data.detalles.length > 0);
  });

  await t.test("Nombre de usuario demasiado corto devuelve 400", async () => {
    const response = await request("POST", "/empresas", {
      body: {
        usuario: {
          nombre_usuario: "ab",
          contrasena_hash: "Registro123!",
          correo: `${unique("corto")}@example.test`,
        },
        empresa: {
          nombre: `QA nombre corto ${ctx.companyA.empresaId}`,
          correo: `corto_${unique("emp")}@example.test`,
        },
      },
    });
    assert.equal(response.status, 400, bodyText(response));
  });

  await t.test("Correo duplicado devuelve 400 y no persiste el registro", async () => {
    const duplicateUsername = unique("qa_dup").slice(0, 50);
    const response = await request("POST", "/empresas", {
      body: {
        usuario: {
          nombre_usuario: duplicateUsername,
          contrasena_hash: "Registro123!",
          correo: ctx.companyA.email,
        },
        empresa: {
          nombre: `QA correo duplicado ${ctx.companyA.empresaId}`,
          correo: `duplicado_${unique("emp")}@example.test`,
        },
      },
    });
    assert.equal(
      response.status,
      400,
      `El correo duplicado debe ser un error de validación 400; respuesta: ${bodyText(response)}`
    );

    const persisted = await login(duplicateUsername, "Registro123!");
    assert.equal(persisted.status, 401, "El usuario con correo duplicado quedó persistido");
  });
});

test("CP-04 - Aislamiento por empresa", async (t) => {
  await t.test("Cliente de otra empresa: lectura devuelve 403/404", async () => {
    const response = await request("GET", `/clientes/${ctx.clientB.id}`, {
      token: ctx.tokenA,
    });
    assertStatusIn(response, [403, 404], "Lectura cruzada de cliente");
  });

  await t.test("Cliente de otra empresa: modificación devuelve 403/404 y no altera datos", async () => {
    const phone = "+56000000000";
    const response = await request("PUT", `/clientes/${ctx.clientB.id}`, {
      token: ctx.tokenA,
      body: makeClientPayload({ nombre: "Intento cruzado", telefono: phone }),
    });
    const verify = await request("GET", `/clientes/${ctx.clientB.id}`, {
      token: ctx.tokenB,
    });
    assertStatusIn(
      response,
      [403, 404],
      `Modificación cruzada de cliente (GET posterior con token B: ${verify.status})`
    );
    assert.equal(verify.status, 200);
    assert.notEqual(verify.data.telefono, phone, "El cliente B fue modificado por el usuario A");
  });

  await t.test("Contrato de otra empresa: lectura devuelve 403/404", async () => {
    const response = await request("GET", `/contratos/${ctx.contractB.id}`, {
      token: ctx.tokenA,
    });
    assertStatusIn(response, [403, 404], "Lectura cruzada de contrato");
  });

  await t.test("Archivos de contrato de otra empresa: lectura devuelve 403/404", async () => {
    const response = await request("GET", `/contratos/${ctx.contractB.id}/files`, {
      token: ctx.tokenA,
    });
    assertStatusIn(response, [403, 404], "Lectura cruzada de archivos de contrato");
  });

  await t.test("No se puede crear un contrato sobre un cliente de otra empresa", async () => {
    const response = await request("POST", "/contratos", {
      token: ctx.tokenA,
      body: makeContractPayload(ctx.clientB.id),
    });
    assertStatusIn(response, [403, 404], "Creación cruzada de contrato");
  });

  await t.test("No se puede eliminar un contrato de otra empresa", async () => {
    const response = await request("DELETE", `/contratos/${ctx.contractB.id}`, {
      token: ctx.tokenA,
    });
    const verify = await request("GET", `/contratos/${ctx.contractB.id}`, {
      token: ctx.tokenB,
    });
    assertStatusIn(
      response,
      [403, 404],
      `Eliminación cruzada de contrato (GET posterior con token B: ${verify.status})`
    );
    assert.equal(verify.status, 200, "El contrato B desapareció tras el intento del usuario A");
  });
});

test("CP-05 - Restricción por rol", async (t) => {
  await t.test("Administrador puede crear usuarios", async () => {
    const username = unique("qa_admin_ok").slice(0, 50);
    const response = await request("POST", "/empresa-usuarios", {
      token: ctx.tokenA,
      body: {
        nombre_usuario: username,
        contrasena_hash: "Usuario123!",
        correo: `${username}@example.test`,
        rol_id: 2,
      },
    });
    assert.equal(response.status, 201, bodyText(response));
  });

  await t.test("Editor no puede crear usuarios", async () => {
    const username = unique("qa_editor_created").slice(0, 50);
    const response = await request("POST", "/usuarios", {
      token: ctx.tokenEditor,
      body: {
        nombre_usuario: username,
        contrasena_hash: "Usuario123!",
        correo: `${username}@example.test`,
      },
    });
    assertStatusIn(response, [401, 403], "El editor pudo crear un usuario");
  });

  await t.test("Editor no puede gestionar roles", async () => {
    const username = unique("qa_editor_role").slice(0, 50);
    const response = await request("POST", "/empresa-usuarios", {
      token: ctx.tokenEditor,
      body: {
        nombre_usuario: username,
        contrasena_hash: "Usuario123!",
        correo: `${username}@example.test`,
        rol_id: 1,
      },
    });
    assertStatusIn(response, [401, 403], "El editor pudo asignar rol administrador");
  });

  await t.test("Editor no puede eliminar usuarios", async () => {
    const username = unique("qa_admin_del").slice(0, 50);
    const created = await request("POST", "/usuarios", {
      token: ctx.tokenA,
      body: {
        nombre_usuario: username,
        contrasena_hash: "Usuario123!",
        correo: `${username}@example.test`,
      },
    });
    assert.equal(created.status, 201, bodyText(created));

    const response = await request("DELETE", `/usuarios/${created.data.id}`, {
      token: ctx.tokenEditor,
    });
    assertStatusIn(response, [401, 403], "El editor pudo eliminar un usuario");
  });
});

test("CP-06 - CRUD de cliente", async (t) => {
  const created = await createClient(ctx.tokenA);

  await t.test("Crear cliente devuelve 201 y queda asociado a la empresa", () => {
    assert.equal(Number(created.empresa_id), ctx.companyA.empresaId);
  });

  await t.test("Listar clientes incluye el cliente creado", async () => {
    const response = await request("GET", "/clientes", { token: ctx.tokenA });
    assert.equal(response.status, 200, bodyText(response));
    assert.ok(
      response.data.some((client) => Number(client.id) === Number(created.id)),
      "El cliente creado no aparece en el listado"
    );
  });

  await t.test("Editar teléfono devuelve 200 y persiste el cambio", async () => {
    const phone = "+56999999999";
    const response = await request("PUT", `/clientes/${created.id}`, {
      token: ctx.tokenA,
      body: makeClientPayload({
        nombre: created.nombre,
        correo: created.correo,
        telefono: phone,
      }),
    });
    assert.equal(response.status, 200, bodyText(response));
    assert.equal(response.data.telefono, phone);

    const verify = await request("GET", `/clientes/${created.id}`, {
      token: ctx.tokenA,
    });
    assert.equal(verify.status, 200);
    assert.equal(verify.data.telefono, phone);
  });

  await t.test("Correo duplicado se rechaza con error de validación", async () => {
    const response = await request("POST", "/clientes", {
      token: ctx.tokenA,
      body: makeClientPayload({ correo: created.correo }),
    });
    assertStatusIn(response, [400, 409], "Cliente duplicado por correo");
  });

  await t.test("Validaciones activas: correo inválido y campos faltantes devuelven 400", async () => {
    const badEmail = await request("POST", "/clientes", {
      token: ctx.tokenA,
      body: makeClientPayload({ correo: "no-es-un-correo" }),
    });
    assert.equal(badEmail.status, 400, bodyText(badEmail));

    const missingFields = await request("POST", "/clientes", {
      token: ctx.tokenA,
      body: { nombre: "Solo nombre" },
    });
    assert.equal(missingFields.status, 400, bodyText(missingFields));
  });

  await t.test("Eliminar cliente devuelve 200/204 y luego responde 404", async () => {
    const response = await request("DELETE", `/clientes/${created.id}`, {
      token: ctx.tokenA,
    });
    assertStatusIn(response, [200, 204], "Eliminación de cliente");

    const verify = await request("GET", `/clientes/${created.id}`, {
      token: ctx.tokenA,
    });
    assert.equal(verify.status, 404, "El cliente sigue existiendo después de eliminarlo");
  });
});

test("CP-07 - CRUD de contrato", async (t) => {
  const created = await createContract(ctx.tokenA, ctx.clientA.id);

  await t.test("Crear contrato devuelve 201 y queda asociado al cliente", () => {
    assert.equal(Number(created.cliente_id), Number(ctx.clientA.id));
  });

  await t.test("Consultar detalle devuelve 200", async () => {
    const response = await request("GET", `/contratos/${created.id}`, {
      token: ctx.tokenA,
    });
    assert.equal(response.status, 200, bodyText(response));
    assert.equal(response.data.titulo, created.titulo);
  });

  await t.test("Editar descripción devuelve 200 y persiste el cambio", async () => {
    const description = `Descripción actualizada ${ctx.companyA.empresaId}`;
    const response = await request("PUT", `/contratos/${created.id}`, {
      token: ctx.tokenA,
      body: { descripcion: description },
    });
    assert.equal(response.status, 200, bodyText(response));
    assert.equal(response.data.descripcion, description);
  });

  await t.test("Fecha fin anterior a la de inicio se rechaza con 400", async () => {
    const response = await request("POST", "/contratos", {
      token: ctx.tokenA,
      body: makeContractPayload(ctx.clientA.id, {
        fecha_inicio: "2026-12-31",
        fecha_fin: "2026-01-01",
      }),
    });
    assert.equal(response.status, 400, bodyText(response));
  });

  await t.test("No se puede asociar un contrato a un cliente de otra empresa", async () => {
    const response = await request("POST", "/contratos", {
      token: ctx.tokenA,
      body: makeContractPayload(ctx.clientB.id),
    });
    assertStatusIn(response, [403, 404], "Contrato asociado a cliente de otra empresa");
  });

  await t.test("No se puede reasignar un contrato a un cliente de otra empresa", async () => {
    const contract = await createContract(ctx.tokenA, ctx.clientA.id);
    const response = await request("PUT", `/contratos/${contract.id}`, {
      token: ctx.tokenA,
      body: { cliente_id: Number(ctx.clientB.id) },
    });
    assertStatusIn(response, [403, 404], "Reasignación de contrato a cliente de otra empresa");
  });

  await t.test("Cliente inexistente se rechaza con 400/404", async () => {
    const response = await request("POST", "/contratos", {
      token: ctx.tokenA,
      body: makeContractPayload(999999999),
    });
    assertStatusIn(response, [400, 404], "Contrato con cliente inexistente");
  });
});

test("CP-08 - Documento contractual", async (t) => {
  const upload = await uploadContractFile(ctx.tokenA, ctx.contractForFiles.id, {
    name: "contrato.pdf",
    bytes: PDF_BYTES,
  });

  await t.test("Subir un PDF válido responde 200/201", () => {
    assertStatusIn(upload, [200, 201], "Carga de PDF válido");
  });

  const files = await request("GET", `/contratos/${ctx.contractForFiles.id}/files`, {
    token: ctx.tokenA,
  });
  const file = Array.isArray(files.data)
    ? files.data.find((item) => item.nombre_archivo === "contrato.pdf")
    : null;

  await t.test("Listar archivos devuelve el documento cargado", () => {
    assert.equal(files.status, 200, bodyText(files));
    assert.ok(file, "El archivo cargado no aparece en el listado");
  });

  await t.test("Descargar el documento devuelve el contenido y tipo correcto", async () => {
    assert.ok(file, "No hay archivo para descargar");
    const response = await request(
      "GET",
      `/contratos/${ctx.contractForFiles.id}/file/${file.id}`,
      { token: ctx.tokenA, binary: true }
    );
    assert.equal(response.status, 200, bodyText(response));
    assert.match(response.contentType, /application\/pdf/i);
    assert.deepEqual(Buffer.from(response.data), Buffer.from(PDF_BYTES));
  });

  await t.test("Sin token no se puede listar archivos", async () => {
    const response = await request("GET", `/contratos/${ctx.contractForFiles.id}/files`);
    assertStatusIn(response, [401], "Listado de archivos sin autenticación");
  });

  await t.test("Sin token no se puede descargar el documento", async () => {
    assert.ok(file, "No hay archivo para descargar");
    const response = await request(
      "GET",
      `/contratos/${ctx.contractForFiles.id}/file/${file.id}`,
      { binary: true }
    );
    assertStatusIn(response, [401], "Descarga de archivo sin autenticación");
  });

  await t.test("Un usuario de otra empresa no puede listar los archivos", async () => {
    const response = await request("GET", `/contratos/${ctx.contractForFiles.id}/files`, {
      token: ctx.tokenB,
    });
    assertStatusIn(response, [403, 404], "Listado de archivos por otra empresa");
  });

  await t.test("Extensión no permitida se rechaza", async () => {
    const response = await uploadContractFile(ctx.tokenA, ctx.contractForFiles.id, {
      name: "malware.exe",
      type: "application/octet-stream",
      bytes: new Uint8Array([0x4d, 0x5a]),
    });
    assertStatusIn(response, [400, 415], "Carga de archivo con extensión no permitida");
  });

  await t.test("Archivo mayor a 10 MB se rechaza con error controlado", async () => {
    const response = await uploadContractFile(ctx.tokenA, ctx.contractForFiles.id, {
      name: "demasiado-grande.pdf",
      bytes: new Uint8Array(11 * 1024 * 1024),
    });
    assertStatusIn(response, [400, 413], "Carga de archivo mayor a 10 MB");
    assert.match(
      response.contentType,
      /application\/json/i,
      "El límite de tamaño debe responder un error JSON controlado, no HTML"
    );
  });
});

test("CP-09 - Enlace compartido protegido", async (t) => {
  const sharePassword = "Clave123";

  await t.test("Otra empresa no puede generar el enlace", async () => {
    const response = await request("POST", `/contratos/${ctx.contractForShare.id}/share`, {
      token: ctx.tokenB,
      body: { password: sharePassword },
    });
    assertStatusIn(response, [403, 404], "Generación cruzada de enlace compartido");
  });

  const share = await request("POST", `/contratos/${ctx.contractForShare.id}/share`, {
    token: ctx.tokenA,
    body: { password: sharePassword },
  });

  await t.test("Generar enlace devuelve un token no predecible", () => {
    assert.equal(share.status, 200, bodyText(share));
    assert.match(share.data.shareToken, /^[a-f0-9]{64}$/);
  });

  const token = share.data.shareToken;

  await t.test("Verificar sin contraseña devuelve 400", async () => {
    const response = await request("POST", `/public/contratos/${token}/verify`, {
      body: {},
    });
    assert.equal(response.status, 400, bodyText(response));
  });

  await t.test("Verificar con contraseña errónea devuelve 401", async () => {
    const response = await request("POST", `/public/contratos/${token}/verify`, {
      body: { password: "incorrecta" },
    });
    assert.equal(response.status, 401, bodyText(response));
  });

  await t.test("Verificar con contraseña válida devuelve solo los datos permitidos", async () => {
    const response = await request("POST", `/public/contratos/${token}/verify`, {
      body: { password: sharePassword },
    });
    assert.equal(response.status, 200, bodyText(response));
    assert.equal(response.data.verified, true);
    assert.ok(!("share_password_hash" in response.data), "Expone share_password_hash");
    assert.ok(!("share_token" in response.data), "Expone share_token");
  });

  await t.test("Listar archivos públicos exige contraseña", async () => {
    const noPassword = await request("GET", `/public/contratos/${token}/files`);
    assert.equal(noPassword.status, 400, bodyText(noPassword));

    const wrongPassword = await request(
      "GET",
      `/public/contratos/${token}/files?password=incorrecta`
    );
    assert.equal(wrongPassword.status, 401, bodyText(wrongPassword));

    const validPassword = await request(
      "GET",
      `/public/contratos/${token}/files?password=${encodeURIComponent(sharePassword)}`
    );
    assert.equal(validPassword.status, 200, bodyText(validPassword));
    assert.ok(Array.isArray(validPassword.data));
  });

  await t.test("Revocar el enlace invalida el acceso", async () => {
    const revoke = await request("DELETE", `/contratos/${ctx.contractForShare.id}/share`, {
      token: ctx.tokenA,
    });
    assert.equal(revoke.status, 200, bodyText(revoke));

    const verify = await request("POST", `/public/contratos/${token}/verify`, {
      body: { password: sharePassword },
    });
    assertStatusIn(verify, [403, 404, 410], "Acceso después de revocar el enlace");
  });
});

test("CP-10 - Auditoría", async (t) => {
  const client = await createClient(ctx.tokenA, {
    nombre: `Cliente auditoría ${unique("audit")}`.slice(0, 255),
  });

  await t.test("Crear, editar y eliminar dejan registro con usuario, acción y fecha", async () => {
    const update = await request("PUT", `/clientes/${client.id}`, {
      token: ctx.tokenA,
      body: makeClientPayload({
        nombre: client.nombre,
        correo: client.correo,
        telefono: "+56988888888",
      }),
    });
    assert.equal(update.status, 200, bodyText(update));

    const remove = await request("DELETE", `/clientes/${client.id}`, {
      token: ctx.tokenA,
    });
    assertStatusIn(remove, [200, 204], "Eliminación para auditoría");

    const audit = await request("GET", "/auditoria", { token: ctx.tokenA });
    assert.equal(audit.status, 200, bodyText(audit));

    const actions = audit.data.map((entry) => entry.accion).join("\n");
    assert.match(actions, /CLIENTES_CREAR/);
    assert.match(actions, /CLIENTES_ACTUALIZAR/);
    assert.match(actions, /CLIENTES_ELIMINAR/);

    const entry = audit.data.find((item) => item.accion.includes("CLIENTES_ELIMINAR"));
    assert.ok(entry, "No se encontró la entrada de eliminación");
    assert.equal(entry.usuario_id, ctx.companyA.username);
    assert.ok(entry.fecha_hora, "La entrada de auditoría no tiene fecha_hora");
  });

  await t.test("La auditoría de una empresa no muestra acciones de otra", async () => {
    const otherClient = await createClient(ctx.tokenB, {
      nombre: `Cliente secreto B ${unique("b")}`.slice(0, 255),
    });

    const audit = await request("GET", "/auditoria", { token: ctx.tokenA });
    assert.equal(audit.status, 200, bodyText(audit));
    assert.ok(
      !audit.data.some((entry) => entry.accion.includes(otherClient.nombre)),
      "La auditoría de A incluye una acción de B"
    );
  });

  await t.test("No se puede insertar un registro de auditoría sin autenticación", async () => {
    const response = await request("POST", "/auditoria", {
      body: {
        accion: "AUDITORIA_FORJADA",
        detalles: "registro insertado sin sesión",
      },
    });
    assertStatusIn(response, [401, 403], "Inserción de auditoría sin autenticación");
  });

  await t.test("Un usuario autenticado no puede forjar entradas de auditoría", async () => {
    const forgedAction = `AUDITORIA_FORJADA_${unique("forja")}`;
    const response = await request("POST", "/auditoria", {
      token: ctx.tokenEditor,
      body: {
        accion: forgedAction,
        detalles: "registro insertado por un editor",
      },
    });

    // La auditoría debe ser de solo lectura para los clientes: solo el backend
    // registra acciones como efecto secundario de operaciones reales.
    assertStatusIn(
      response,
      [401, 403, 405],
      "Un editor pudo insertar una entrada de auditoría arbitraria"
    );

    const audit = await request("GET", "/auditoria", { token: ctx.tokenA });
    assert.equal(audit.status, 200, bodyText(audit));
    assert.ok(
      !audit.data.some((entry) => entry.accion.includes(forgedAction)),
      "La entrada de auditoría forjada quedó registrada"
    );
  });
});

test("CP-11 - Errores y sesión expirada", async (t) => {
  const noToken = await request("GET", "/clientes");
  const invalidToken = await request("GET", "/clientes", {
    token: "esto-no-es-un-jwt",
  });
  const expiredToken = signJwt({
    usuarioId: ctx.companyA.usuarioId,
    nombreUsuario: ctx.companyA.username,
    empresaId: ctx.companyA.empresaId,
    rolId: 1,
    rolNombre: "administrador",
  });

  await t.test("Sin Authorization devuelve 401 sin stack trace", () => {
    assert.equal(noToken.status, 401, bodyText(noToken));
    assert.doesNotMatch(bodyText(noToken), /node_modules|\n\s+at\s/);
  });

  await t.test("Bearer inválido devuelve 401 sin stack trace", () => {
    assert.equal(invalidToken.status, 401, bodyText(invalidToken));
    assert.doesNotMatch(bodyText(invalidToken), /node_modules|\n\s+at\s/);
  });

  await t.test("Token expirado devuelve 401", async () => {
    const response = await request("GET", "/clientes", { token: expiredToken });
    assert.equal(response.status, 401, bodyText(response));
  });

  await t.test("No se expone la versión de Express (hallazgo relacionado)", async () => {
    const response = await request("GET", "/");
    assert.equal(
      header(response, "x-powered-by"),
      null,
      `La respuesta expone X-Powered-By: ${header(response, "x-powered-by")}`
    );
  });
});
