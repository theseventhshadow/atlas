import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

export const API_URL = process.env.API_URL || "http://localhost:4451";
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3351";

// Identificador único por ejecución para no chocar con datos de corridas anteriores.
export const RUN_ID = `${Date.now().toString(36)}${Math.random()
  .toString(36)
  .slice(2, 6)}`;

let sequence = 0;

export function unique(prefix) {
  sequence += 1;
  return `${prefix}_${RUN_ID}_${sequence}`;
}

/**
 * Cliente HTTP mínimo sobre fetch (Node 18+). No requiere dependencias externas.
 */
export async function request(
  method,
  path,
  { token, body, form, binary = false, headers = {} } = {}
) {
  const finalHeaders = { ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: payload,
  });

  const contentType = response.headers.get("content-type") || "";
  let data;
  if (binary) {
    data = Buffer.from(await response.arrayBuffer());
  } else if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    contentType,
    data,
  };
}

export function readJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  const envPath = new URL("../../.env", import.meta.url);
  const raw = fs.readFileSync(envPath, "utf8");
  const match = raw.match(/^\s*JWT_SECRET\s*=\s*(.+?)\s*$/m);
  return match ? match[1] : "inseguro";
}

export function decodeJwt(token) {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

export function signJwt(payload, { secret = readJwtSecret(), expiresIn = -60 } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: now, exp: now + expiresIn })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function header(result, name) {
  return result.headers.get(name);
}

export function bodyText(result) {
  return typeof result.data === "string"
    ? result.data
    : JSON.stringify(result.data);
}

export async function createCompany(label) {
  const username = unique(`qa_${label}`).slice(0, 50);
  const password = "QaPass123!";
  const email = `${username}@example.test`;

  const response = await request("POST", "/empresas", {
    body: {
      usuario: {
        nombre_usuario: username,
        contrasena_hash: password,
        correo: email,
      },
      empresa: {
        nombre: `QA ${label.toUpperCase()} ${RUN_ID}`,
        direccion: "Av. QA 100, Santiago",
        telefono: "+5622000000",
        correo: `empresa_${username}@example.test`,
      },
    },
  });

  assert.equal(
    response.status,
    201,
    `No se pudo crear la empresa ${label}: ${response.status} ${bodyText(response)}`
  );

  return {
    label,
    username,
    password,
    email,
    usuarioId: Number(response.data.usuario.id),
    empresaId: Number(response.data.empresa.id),
    empresaNombre: response.data.empresa.nombre,
  };
}

export async function login(nombre_usuario, password) {
  return request("POST", "/autenticacion/login", {
    body: { nombre_usuario, password },
  });
}

export async function loginOk(company) {
  const response = await login(company.username, company.password);
  assert.equal(
    response.status,
    200,
    `Login falló para ${company.username}: ${response.status} ${bodyText(response)}`
  );
  assert.ok(response.data.token, "El login no devolvió token");
  return response.data.token;
}

export function makeClientPayload(overrides = {}) {
  const id = unique("cli");
  return {
    nombre: `Cliente ${id}`.slice(0, 255),
    correo: `${id}@example.test`,
    telefono: "+56911111111",
    direccion: "Av. QA 100, Santiago",
    es_empresa: false,
    rut: "12.345.678-5",
    nombre_fantasia: `Fantasia ${id}`.slice(0, 255),
    giro_actividad_economica: "Servicios de prueba",
    nombre_representante: "Ana QA",
    cargo_representante: "Gerente",
    correo_representante: `${id}.rep@example.test`,
    telefono_representante: "+56922222222",
    relacion_representante: "Representante legal",
    direccion_calle: "Av. QA",
    direccion_numero: "100",
    direccion_ciudad: "Santiago",
    direccion_region: "Región Metropolitana de Santiago",
    sitio_web: "https://example.test",
    telefono_corporativo: "+56222222222",
    nombre_banco: "Banco de Chile",
    numero_cuenta: `${Date.now()}${sequence}`,
    titular_cuenta: "Cliente QA SpA",
    metodo_pago: "transferencia",
    dia_pago: "5",
    moneda: "CLP",
    ...overrides,
  };
}

export async function createClient(token, overrides = {}) {
  const response = await request("POST", "/clientes", {
    token,
    body: makeClientPayload(overrides),
  });
  assert.equal(
    response.status,
    201,
    `No se pudo crear el cliente: ${response.status} ${bodyText(response)}`
  );
  return response.data;
}

export function makeContractPayload(clienteId, overrides = {}) {
  const id = unique("contrato");
  return {
    cliente_id: clienteId,
    titulo: `Contrato ${id}`.slice(0, 255),
    descripcion: "Contrato de prueba creado por la suite automatizada.",
    fecha_inicio: "2026-01-01",
    fecha_fin: "2026-12-31",
    ...overrides,
  };
}

export async function createContract(token, clienteId, overrides = {}) {
  const response = await request("POST", "/contratos", {
    token,
    body: makeContractPayload(clienteId, overrides),
  });
  assert.equal(
    response.status,
    201,
    `No se pudo crear el contrato: ${response.status} ${bodyText(response)}`
  );
  return response.data;
}

export async function uploadContractFile(
  token,
  contractId,
  { name, type = "application/pdf", bytes }
) {
  const form = new FormData();
  form.append("files", new Blob([bytes], { type }), name);
  return request("PUT", `/contratos/${contractId}`, {
    token,
    form,
  });
}

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function assertStatusIn(result, allowed, message) {
  assert.ok(
    allowed.includes(result.status),
    `${message}: se esperaba ${allowed.join("/")} y se obtuvo ${
      result.status
    } (${bodyText(result).slice(0, 500)})`
  );
}

export { assert };
