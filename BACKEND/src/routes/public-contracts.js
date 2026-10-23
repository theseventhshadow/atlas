const express = require("express");
const { pool } = require("../db");

const router = express.Router();

// Endpoint público para verificar contraseña y obtener información del contrato
router.post("/:token/verify", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: "Contraseña requerida",
        glosa: "Debe proporcionar una contraseña",
      });
    }

    const result = await pool.query(
      `SELECT 
        c.id, 
        c.titulo, 
        c.descripcion, 
        c.fecha_inicio, 
        c.fecha_fin, 
        c.share_password_hash,
        c.share_enabled,
        cl.nombre AS cliente_nombre
      FROM contratos c
      INNER JOIN clientes cl ON cl.id = c.cliente_id
      WHERE c.share_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Contrato no encontrado",
        glosa: "El enlace compartido no es válido o ha sido desactivado",
      });
    }

    const contrato = result.rows[0];

    if (!contrato.share_enabled) {
      return res.status(403).json({
        error: "Enlace desactivado",
        glosa: "Este enlace compartido ha sido desactivado",
      });
    }

    // Verificar contraseña (en este sistema vulnerable, comparación directa)
    // En producción debería usarse bcrypt.compare
    if (contrato.share_password_hash !== password) {
      return res.status(401).json({
        error: "Contraseña incorrecta",
        glosa: "La contraseña proporcionada no es correcta",
      });
    }

    // Retornar información del contrato (sin datos sensibles)
    res.json({
      id: contrato.id,
      titulo: contrato.titulo,
      descripcion: contrato.descripcion,
      fecha_inicio: contrato.fecha_inicio,
      fecha_fin: contrato.fecha_fin,
      cliente_nombre: contrato.cliente_nombre,
      verified: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al verificar contraseña",
      glosa: err.message || err.toString(),
    });
  }
});

// Endpoint público para listar archivos del contrato compartido (requiere verificación previa)
router.get("/:token/files", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    if (!password) {
      return res.status(400).json({
        error: "Contraseña requerida",
        glosa: "Debe proporcionar una contraseña como query parameter",
      });
    }

    // Verificar token y contraseña
    const contratoCheck = await pool.query(
      `SELECT c.id, c.share_password_hash, c.share_enabled
       FROM contratos c
       WHERE c.share_token = $1`,
      [token]
    );

    if (contratoCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Contrato no encontrado",
        glosa: "El enlace compartido no es válido",
      });
    }

    const contrato = contratoCheck.rows[0];

    if (!contrato.share_enabled) {
      return res.status(403).json({
        error: "Enlace desactivado",
        glosa: "Este enlace compartido ha sido desactivado",
      });
    }

    if (contrato.share_password_hash !== password) {
      return res.status(401).json({
        error: "Contraseña incorrecta",
        glosa: "La contraseña proporcionada no es correcta",
      });
    }

    // Obtener archivos del contrato
    const docs = await pool.query(
      "SELECT id, nombre_archivo, created_at FROM documentos_contrato WHERE contract_id=$1 ORDER BY created_at DESC",
      [contrato.id]
    );

    res.json(docs.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al obtener archivos",
      glosa: err.message || err.toString(),
    });
  }
});

// Endpoint público para descargar un archivo específico del contrato compartido
router.get("/:token/file/:fileId", async (req, res) => {
  try {
    const { token, fileId } = req.params;
    const { password } = req.query;

    if (!password) {
      return res.status(400).json({
        error: "Contraseña requerida",
        glosa: "Debe proporcionar una contraseña como query parameter",
      });
    }

    // Verificar token y contraseña
    const contratoCheck = await pool.query(
      `SELECT c.id, c.share_password_hash, c.share_enabled
       FROM contratos c
       WHERE c.share_token = $1`,
      [token]
    );

    if (contratoCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Contrato no encontrado",
        glosa: "El enlace compartido no es válido",
      });
    }

    const contrato = contratoCheck.rows[0];

    if (!contrato.share_enabled) {
      return res.status(403).json({
        error: "Enlace desactivado",
        glosa: "Este enlace compartido ha sido desactivado",
      });
    }

    if (contrato.share_password_hash !== password) {
      return res.status(401).json({
        error: "Contraseña incorrecta",
        glosa: "La contraseña proporcionada no es correcta",
      });
    }

    // Verificar que el archivo pertenece al contrato
    const doc = await pool.query(
      "SELECT document, nombre_archivo FROM documentos_contrato WHERE id=$1 AND contract_id=$2",
      [fileId, contrato.id]
    );

    if (doc.rows.length === 0) {
      return res.status(404).json({
        error: "Archivo no encontrado",
        glosa: "El archivo solicitado no existe o no pertenece a este contrato",
      });
    }

    const buffer = doc.rows[0].document;
    const nombreArchivo = doc.rows[0].nombre_archivo || "contrato.pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${nombreArchivo}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Error al obtener archivo",
      glosa: err.message || err.toString(),
    });
  }
});

module.exports = router;

