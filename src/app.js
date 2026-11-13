import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { engine } from 'express-handlebars';
import mongoose from 'mongoose';

import { connectDB, getConnectionStatus } from './config/db.js';
import { syncPostmanFilesOnDisk, buildPostmanCollection } from './config/postmanSync.js';
import Avistamiento from './models/Avistamiento.js';
import apiRouter from './routes/api.router.js';
import viewsRouter from './routes/views.router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.engine(
  'handlebars',
  engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    helpers: {
      eq: (a, b) => a === b,
      formatearFecha: (fecha) => {
        if (!fecha) return 'Sin fecha';
        return new Date(fecha).toLocaleString('es-CO', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
      },
      badgeConservacion: (estado) => {
        switch (estado) {
          case 'En peligro':
            return 'badge-conservacion badge-peligro';
          case 'Vulnerable':
            return 'badge-conservacion badge-vulnerable';
          case 'Preocupación menor':
          default:
            return 'badge-conservacion badge-menor';
        }
      },
      claseCategoria: (categoria) => {
        switch (categoria) {
          case 'Mamífero':
            return 'badge-categoria cat-mamifero';
          case 'Ave':
            return 'badge-categoria cat-ave';
          case 'Reptil':
            return 'badge-categoria cat-reptil';
          case 'Anfibio':
            return 'badge-categoria cat-anfibio';
          case 'Flora':
          default:
            return 'badge-categoria cat-flora';
        }
      },
    },
  })
);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.get('/api/config/status', (req, res) => {
  res.json(getConnectionStatus());
});

app.post('/api/config/mongo', async (req, res) => {
  const { mongoUri } = req.body;
  const resultado = await connectDB(mongoUri);
  if (resultado.connected) {
    await syncPostmanFilesOnDisk();
  }

  const esForm = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
  if (esForm) {
    if (resultado.connected) {
      return res.redirect('/?msg=' + encodeURIComponent('Conectado exitosamente a MongoDB Atlas (biocaqueta_db) y guardado en .env'));
    }
    return res.redirect('/?error=' + encodeURIComponent('No se pudo conectar a MongoDB Atlas: ' + resultado.error));
  }

  return res.status(resultado.connected ? 200 : 400).json(resultado);
});

app.post('/api/config/seed', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.redirect('/?error=' + encodeURIComponent('Conecta MongoDB Atlas primero antes de cargar ejemplos.'));
  }

  try {
    const ejemplos = [
      {
        nombreComun: 'Danta amazónica',
        nombreCientifico: 'Tapirus terrestris',
        categoria: 'Mamífero',
        zona: 'Reserva Natural El Caraño',
        estadoConservacion: 'Vulnerable',
        investigador: 'Ing. Carlos Ramírez - UDLA',
      },
      {
        nombreComun: 'Guacamaya bandera',
        nombreCientifico: 'Ara macao',
        categoria: 'Ave',
        zona: 'Río Hacha',
        estadoConservacion: 'Preocupación menor',
        investigador: 'Laura Valentina Rojas',
      },
      {
        nombreComun: 'Rana venenosa del Caquetá',
        nombreCientifico: 'Ranitomeya amazonica',
        categoria: 'Anfibio',
        zona: 'Cordillera Oriental',
        estadoConservacion: 'En peligro',
        investigador: 'Semillero BioAmazonia',
      },
      {
        nombreComun: 'Palma de Canangucha',
        nombreCientifico: 'Mauritia flexuosa',
        categoria: 'Flora',
        zona: 'Serranía de Chiribiquete',
        estadoConservacion: 'Preocupación menor',
        investigador: 'Docente Andrés Felipe Patiño',
      },
    ];

    await Avistamiento.insertMany(ejemplos);
    await syncPostmanFilesOnDisk();
    return res.redirect('/?msg=' + encodeURIComponent('Se cargaron 4 avistamientos de ejemplo en biocaqueta_db.'));
  } catch (error) {
    return res.redirect('/?error=' + encodeURIComponent(error.message));
  }
});

app.get('/api/postman-collection', async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  let sampleId = '6734a1b2c3d4e5f6a7b8c9d0';

  if (mongoose.connection.readyState === 1) {
    try {
      const ultimo = await Avistamiento.findOne().sort({ fechaRegistro: -1 }).lean();
      if (ultimo && ultimo._id) {
        sampleId = String(ultimo._id);
      }
    } catch (_) {}
  }

  const postmanCollection = buildPostmanCollection(baseUrl, sampleId);

  if (req.query.download) {
    res.setHeader('Content-Disposition', 'attachment; filename="BioCaqueta.postman_collection.json"');
  }
  return res.status(200).json(postmanCollection);
});

app.use('/api/avistamientos', apiRouter);
app.use('/', viewsRouter);

connectDB().finally(async () => {
  await syncPostmanFilesOnDisk();
  app.listen(PORT, () => {
    console.log(`Servidor BioCaquetá ejecutándose en: http://localhost:${PORT}`);
    console.log(`Carpeta de Postman sincronizada en: ./postman/collections`);
  });
});

export default app;
