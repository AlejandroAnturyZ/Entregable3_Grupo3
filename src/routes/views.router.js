import express from 'express';
import mongoose from 'mongoose';
import Avistamiento from '../models/Avistamiento.js';
import { getConnectionStatus } from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const dbStatus = getConnectionStatus();
  const { categoria, error, msg } = req.query;

  let avistamientos = [];
  let consultaError = error || null;

  if (dbStatus.connected) {
    try {
      const filtro = {};
      if (categoria && categoria.trim() !== '') {
        filtro.categoria = categoria.trim();
      }

      avistamientos = await Avistamiento.find(filtro)
        .sort({ fechaRegistro: -1 })
        .lean();
    } catch (err) {
      consultaError = err.message;
    }
  }

  return res.render('home', {
    titulo: 'BioCaquetá - Monitoreo de Biodiversidad',
    avistamientos,
    totalRegistros: avistamientos.length,
    categoriaSeleccionada: categoria || '',
    categorias: Avistamiento.CATEGORIAS_VALIDAS,
    estadosConservacion: Avistamiento.ESTADOS_CONSERVACION,
    dbStatus,
    alertaError: consultaError,
    alertaExito: msg || null,
  });
});

router.get('/editar/:id', async (req, res) => {
  const dbStatus = getConnectionStatus();
  const { id } = req.params;

  if (!dbStatus.connected) {
    return res.redirect('/?error=' + encodeURIComponent('Conecta MongoDB Atlas antes de editar registros.'));
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.redirect('/?error=' + encodeURIComponent('El ID del avistamiento no es válido.'));
  }

  try {
    const avistamiento = await Avistamiento.findById(id).lean();

    if (!avistamiento) {
      return res.redirect('/?error=' + encodeURIComponent('No se encontró el avistamiento solicitado.'));
    }

    return res.render('editar', {
      titulo: `Editar Avistamiento - ${avistamiento.nombreComun}`,
      avistamiento,
      categorias: Avistamiento.CATEGORIAS_VALIDAS,
      estadosConservacion: Avistamiento.ESTADOS_CONSERVACION,
      dbStatus,
    });
  } catch (error) {
    return res.redirect('/?error=' + encodeURIComponent(error.message));
  }
});

export default router;
