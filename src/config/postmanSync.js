import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Avistamiento from '../models/Avistamiento.js';

export const buildPostmanCollection = (baseUrl = 'http://localhost:3000', sampleId = '6734a1b2c3d4e5f6a7b8c9d0') => {
  return {
    info: {
      name: 'BioCaquetá - API Monitoreo de Biodiversidad (UDLA)',
      description:
        'Colección oficial de Postman para validar los endpoints REST de BioCaquetá contra MongoDB Atlas (biocaqueta_db).',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      {
        key: 'baseUrl',
        value: baseUrl,
        type: 'string',
      },
      {
        key: 'avistamientoId',
        value: sampleId,
        type: 'string',
      },
    ],
    item: [
      {
        name: '1. GET - Listar todos los avistamientos',
        request: {
          method: 'GET',
          header: [],
          url: {
            raw: '{{baseUrl}}/api/avistamientos',
            host: ['{{baseUrl}}'],
            path: ['api', 'avistamientos'],
          },
          description: 'Retorna en formato JSON todos los avistamientos ordenados del más reciente al más antiguo.',
        },
      },
      {
        name: '2. GET - Filtrar avistamientos por categoría (Query Param)',
        request: {
          method: 'GET',
          header: [],
          url: {
            raw: '{{baseUrl}}/api/avistamientos?categoria=Ave',
            host: ['{{baseUrl}}'],
            path: ['api', 'avistamientos'],
            query: [
              {
                key: 'categoria',
                value: 'Ave',
                description: 'Valores permitidos: Mamífero, Ave, Reptil, Anfibio, Flora',
              },
            ],
          },
          description: 'Filtra los avistamientos por categoría usando query params.',
        },
      },
      {
        name: '3. POST - Registrar nuevo avistamiento (JSON)',
        request: {
          method: 'POST',
          header: [
            {
              key: 'Content-Type',
              value: 'application/json',
            },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                nombreComun: 'Tití del Caquetá',
                nombreCientifico: 'Plecturocebus caquetensis',
                categoria: 'Mamífero',
                zona: 'Reserva Natural El Caraño',
                estadoConservacion: 'En peligro',
                investigador: 'Grupo Investigación Ambiental UDLA',
              },
              null,
              2
            ),
          },
          url: {
            raw: '{{baseUrl}}/api/avistamientos',
            host: ['{{baseUrl}}'],
            path: ['api', 'avistamientos'],
          },
          description: 'Crea un nuevo avistamiento en MongoDB Atlas y retorna código 201 Created con el documento creado.',
        },
      },
      {
        name: '4. PUT - Actualizar estado de conservación o zona',
        request: {
          method: 'PUT',
          header: [
            {
              key: 'Content-Type',
              value: 'application/json',
            },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                zona: 'Serranía de Chiribiquete',
                estadoConservacion: 'Vulnerable',
              },
              null,
              2
            ),
          },
          url: {
            raw: '{{baseUrl}}/api/avistamientos/{{avistamientoId}}',
            host: ['{{baseUrl}}'],
            path: ['api', 'avistamientos', '{{avistamientoId}}'],
          },
          description: 'Actualiza el estado de conservación o la zona de un avistamiento existente por su _id.',
        },
      },
      {
        name: '5. DELETE - Eliminar avistamiento por ID',
        request: {
          method: 'DELETE',
          header: [],
          url: {
            raw: '{{baseUrl}}/api/avistamientos/{{avistamientoId}}',
            host: ['{{baseUrl}}'],
            path: ['api', 'avistamientos', '{{avistamientoId}}'],
          },
          description: 'Elimina el registro de MongoDB Atlas mediante findByIdAndDelete(id).',
        },
      },
    ],
  };
};

export const syncPostmanFilesOnDisk = async () => {
  try {
    const port = process.env.PORT || 3000;
    const baseUrl = `http://localhost:${port}`;
    let sampleId = '6734a1b2c3d4e5f6a7b8c9d0';

    if (mongoose.connection.readyState === 1) {
      const ultimo = await Avistamiento.findOne().sort({ fechaRegistro: -1 }).lean();
      if (ultimo && ultimo._id) {
        sampleId = String(ultimo._id);
      }
    }

    const yamlDefinition = [
      '$kind: collection',
      'description: Colección oficial de Postman para validar los endpoints REST de BioCaquetá contra MongoDB Atlas (biocaqueta_db).',
      'variables:',
      `  baseUrl: ${baseUrl}`,
      `  avistamientoId: ${sampleId}`,
      '',
    ].join('\n');

    const defPath = path.resolve(
      process.cwd(),
      'postman',
      'collections',
      'BioCaquetá - API Monitoreo de Biodiversidad (UDLA)',
      '.resources',
      'definition.yaml'
    );

    if (fs.existsSync(defPath)) {
      fs.writeFileSync(defPath, yamlDefinition, 'utf8');
    }

    return buildPostmanCollection(baseUrl, sampleId);
  } catch (err) {
    console.warn('No se pudo sincronizar archivo local de Postman:', err.message);
    return buildPostmanCollection();
  }
};
