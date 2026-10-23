const express = require("express");
const { pool } = require("../db");
const jwt = require("jsonwebtoken");
const validate = require("../middleware/validate");
const {
  createEmpresaSchema,
  createEmpresaConUsuarioSchema,
  updateEmpresaSchema,
} = require("../validations/empresas");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "inseguro";

function getUserFromAuthHeader(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  try {
    const token = auth.substring(7);
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

router.post("/", async (req, res) => {
  if (req.body.usuario && req.body.empresa) {
    try {
      await createEmpresaConUsuarioSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    } catch (error) {
      if (error.name === "ValidationError") {
        const errors = error.inner.map((err) => ({
          field: err.path,
          message: err.message,
        }));
        return res.status(400).json({
          error: "Error de validación",
          glosa: "Los datos proporcionados no son válidos",
          detalles: errors,
        });
      }
      return res.status(500).json({
        error: "Error en la validación",
        glosa: error.message || error.toString(),
      });
    }
    const { usuario, empresa } = req.body;
    const { nombre_usuario, contrasena_hash, correo: correoUsuario } = usuario;
    const { nombre, direccion = null, telefono = null, correo } = empresa;

    try {
      const usuarioResult = await pool.query(
        "INSERT INTO usuarios (nombre_usuario, contrasena_hash, correo) VALUES ($1, $2, $3) RETURNING id, nombre_usuario, correo, created_at",
        [nombre_usuario, contrasena_hash, correoUsuario]
      );
      const usuarioId = usuarioResult.rows[0].id;

      const empresaResult = await pool.query(
        "INSERT INTO empresas (nombre, direccion, telefono, correo) VALUES ($1, $2, $3, $4) RETURNING *",
        [nombre, direccion, telefono, correo]
      );
      const empresaId = empresaResult.rows[0].id;

      await pool.query(
        "INSERT INTO empresa_usuarios (empresa_id, usuario_id, rol_id) VALUES ($1, $2, $3) RETURNING *",
        [empresaId, usuarioId, 1]
      );

      res.status(201).json({
        usuario: usuarioResult.rows[0],
        empresa: empresaResult.rows[0],
      });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({
          error: "Error al crear empresa con usuario",
          glosa: err.message || err.toString(),
        });
    }
  } else {
    try {
      await createEmpresaSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    } catch (error) {
      if (error.name === "ValidationError") {
        const errors = error.inner.map((err) => ({
          field: err.path,
          message: err.message,
        }));
        return res.status(400).json({
          error: "Error de validación",
          glosa: "Los datos proporcionados no son válidos",
          detalles: errors,
        });
      }
      return res.status(500).json({
        error: "Error en la validación",
        glosa: error.message || error.toString(),
      });
    }
    const { nombre, direccion = null, telefono = null, correo } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO empresas (nombre, direccion, telefono, correo) VALUES ($1, $2, $3, $4) RETURNING *",
        [nombre, direccion, telefono, correo]
      );

      const authUser = getUserFromAuthHeader(req);
      await pool.query(
        "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
        [
          authUser?.nombreUsuario || null,
          `EMPRESAS_CREAR: creó empresa ${nombre}`,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({
          error: "Error al crear empresa",
          glosa: err.message || err.toString(),
        });
    }
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM empresas ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        error: "Error al listar empresas",
        glosa: err.message || err.toString(),
      });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM empresas WHERE id=$1", [
      req.params.id,
    ]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "No encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        error: "Error al obtener empresa",
        glosa: err.message || err.toString(),
      });
  }
});

router.put("/:id", validate(updateEmpresaSchema), async (req, res) => {
  const { nombre, direccion = null, telefono = null, correo } = req.body;
  try {
    const result = await pool.query(
      "UPDATE empresas SET nombre=$1, direccion=$2, telefono=$3, correo=$4 WHERE id=$5 RETURNING *",
      [nombre, direccion, telefono, correo, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "No encontrado" });

    const authUser = getUserFromAuthHeader(req);
    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
      [
        authUser?.nombreUsuario || null,
        `EMPRESAS_ACTUALIZAR: actualizó empresa ID ${req.params.id}`,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        error: "Error al actualizar empresa",
        glosa: err.message || err.toString(),
      });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM empresas WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "No encontrado" });

    const authUser = getUserFromAuthHeader(req);
    await pool.query(
      "INSERT INTO auditoria (usuario_id, accion) VALUES ($1, $2)",
      [
        authUser?.nombreUsuario || null,
        `EMPRESAS_ELIMINAR: eliminó empresa ID ${req.params.id}`,
      ]
    );

    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        error: "Error al eliminar empresa",
        glosa: err.message || err.toString(),
      });
  }
});

module.exports = router;
