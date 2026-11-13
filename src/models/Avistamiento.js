import mongoose from 'mongoose';

export const CATEGORIAS_VALIDAS = ['Mamífero', 'Ave', 'Reptil', 'Anfibio', 'Flora'];
export const ESTADOS_CONSERVACION = ['Preocupación menor', 'Vulnerable', 'En peligro'];

const avistamientoSchema = new mongoose.Schema(
  {
    nombreComun: {
      type: String,
      required: [true, 'El nombre común de la especie es obligatorio'],
      trim: true,
    },
    nombreCientifico: {
      type: String,
      required: [true, 'El nombre científico de la especie es obligatorio'],
      trim: true,
    },
    categoria: {
      type: String,
      required: [true, 'La categoría biológica es obligatoria'],
      enum: {
        values: CATEGORIAS_VALIDAS,
        message: 'La categoría "{VALUE}" no es válida. Valores permitidos: Mamífero, Ave, Reptil, Anfibio, Flora',
      },
    },
    zona: {
      type: String,
      required: [true, 'La zona de avistamiento es obligatoria'],
      trim: true,
    },
    estadoConservacion: {
      type: String,
      required: false,
      enum: {
        values: ESTADOS_CONSERVACION,
        message: 'El estado de conservación "{VALUE}" no es válido. Valores permitidos: Preocupación menor, Vulnerable, En peligro',
      },
      default: 'Preocupación menor',
    },
    investigador: {
      type: String,
      required: [true, 'El nombre del investigador (estudiante o docente) es obligatorio'],
      trim: true,
    },
    fechaRegistro: {
      type: Date,
      required: false,
      default: Date.now,
    },
  },
  {
    collection: 'avistamientos',
    versionKey: false,
  }
);

const Avistamiento = mongoose.model('Avistamiento', avistamientoSchema);

Avistamiento.CATEGORIAS_VALIDAS = CATEGORIAS_VALIDAS;
Avistamiento.ESTADOS_CONSERVACION = ESTADOS_CONSERVACION;

export default Avistamiento;
