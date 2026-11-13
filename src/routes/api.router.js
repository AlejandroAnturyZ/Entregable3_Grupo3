import express from 'express';
import mongoose from 'mongoose';
import Avistamiento from '../models/Avistamiento.js';
import { syncPostmanFilesOnDisk } from '../config/postmanSync.js';

const router = express.Router();

const esPeticionFormularioHTML = (req) => {
  return Boolean(
    req.headers['content-type']?.includes('application/x-www-form-urlencoded')
  );
};

const verificarConexionDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    if (esPeticionFormularioHTML(req) || req.headers.accept?.includes('text/html')) {
      return res.redirect('/?error=' + encodeURIComponent('Debes conectar MongoDB Atlas primero desde el botón "Configurar Atlas".'));
    }
    return res.status(503).json({
      error: 'Base de datos no conectada',
      mensaje: 'Configura tu MONGO_URI en el archivo .env o desde el botón "Configurar Atlas" en http://localhost:3000',
    });
  }
  next();
};

router.get('/', verificarConexionDB, async (req, res) => {
  try {
    const { categoria } = req.query;
    const filtro = {};

    if (categoria && categoria.trim() !== '') {
      filtro.categoria = categoria.trim();
    }

    const avistamientos = await Avistamiento.find(filtro).sort({ fechaRegistro: -1 });
    return res.status(200).json(avistamientos);
  } catch (error) {
    console.error('Error en GET /api/avistamientos:', error.message);
    return res.status(500).json({
      error: 'Error al consultar los avistamientos',
      detalle: error.message,
    });
  }
});

router.post('/', verificarConexionDB, async (req, res) => {
  try {
    const datos = { ...req.body };

    if (!datos.estadoConservacion || datos.estadoConservacion.trim() === '') {
      delete datos.estadoConservacion;
    }
    if (!datos.fechaRegistro || datos.fechaRegistro === '') {
      delete datos.fechaRegistro;
    }

    const nuevoAvistamiento = await Avistamiento.create(datos);
    await syncPostmanFilesOnDisk();

    if (esPeticionFormularioHTML(req)) {
      return res.redirect('/');
    }

    return res.status(201).json(nuevoAvistamiento);
  } catch (error) {
    console.error('Error en POST /api/avistamientos:', error.message);
    if (esPeticionFormularioHTML(req)) {
      return res.redirect('/?error=' + encodeURIComponent(error.message));
    }
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    return res.status(statusCode).json({
      error: 'Error al registrar el avistamiento',
      detalle: error.message,
    });
  }
});

const actualizarAvistamiento = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      if (esPeticionFormularioHTML(req)) {
        return res.redirect('/?error=' + encodeURIComponent('ID de avistamiento inválido'));
      }
      return res.status(400).json({ error: 'El ID proporcionado no es válido en MongoDB' });
    }

    const camposActualizar = {};
    const camposPermitidos = [
      'nombreComun',
      'nombreCientifico',
      'categoria',
      'zona',
      'estadoConservacion',
      'investigador',
    ];

    camposPermitidos.forEach((campo) => {
      if (req.body[campo] !== undefined && req.body[campo] !== '') {
        camposActualizar[campo] = req.body[campo];
      }
    });

    const avistamientoActualizado = await Avistamiento.findByIdAndUpdate(
      id,
      camposActualizar,
      { new: true, runValidators: true }
    );

    if (!avistamientoActualizado) {
      if (esPeticionFormularioHTML(req)) {
        return res.redirect('/?error=' + encodeURIComponent('Avistamiento no encontrado'));
      }
      return res.status(404).json({ error: 'Avistamiento no encontrado' });
    }

    if (esPeticionFormularioHTML(req)) {
      return res.redirect('/');
    }

    return res.status(200).json(avistamientoActualizado);
  } catch (error) {
    console.error('Error al actualizar avistamiento:', error.message);
    if (esPeticionFormularioHTML(req)) {
      return res.redirect('/?error=' + encodeURIComponent(error.message));
    }
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    return res.status(statusCode).json({
      error: 'Error al actualizar el avistamiento',
      detalle: error.message,
    });
  }
};

router.put('/:id', verificarConexionDB, actualizarAvistamiento);
router.post('/update/:id', verificarConexionDB, actualizarAvistamiento);

const eliminarAvistamiento = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      if (esPeticionFormularioHTML(req)) {
        return res.redirect('/?error=' + encodeURIComponent('ID de avistamiento inválido'));
      }
      return res.status(400).json({ error: 'El ID proporcionado no es válido en MongoDB' });
    }

    const avistamientoEliminado = await Avistamiento.findByIdAndDelete(id);
    await syncPostmanFilesOnDisk();

    if (!avistamientoEliminado) {
      if (esPeticionFormularioHTML(req)) {
        return res.redirect('/?error=' + encodeURIComponent('Avistamiento no encontrado'));
      }
      return res.status(404).json({ error: 'Avistamiento no encontrado' });
    }

    if (esPeticionFormularioHTML(req) || req.method === 'POST') {
      if (!req.headers.accept?.includes('application/json')) {
        return res.redirect('/');
      }
    }

    return res.status(200).json({
      mensaje: 'Avistamiento eliminado exitosamente',
      avistamiento: avistamientoEliminado,
    });
  } catch (error) {
    console.error('Error al eliminar avistamiento:', error.message);
    if (esPeticionFormularioHTML(req)) {
      return res.redirect('/?error=' + encodeURIComponent(error.message));
    }
    return res.status(500).json({
      error: 'Error al eliminar el avistamiento',
      detalle: error.message,
    });
  }
};

router.delete('/:id', verificarConexionDB, eliminarAvistamiento);
router.post('/delete/:id', verificarConexionDB, eliminarAvistamiento);

export default router;
