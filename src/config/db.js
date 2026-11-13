import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

let lastConnectionError = null;

const maskMongoUri = (uri) => {
  if (!uri) return '';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
};

const saveUriToEnvFile = (newUri) => {
  const envPath = path.resolve(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    if (/^MONGO_URI=.*$/m.test(envContent)) {
      envContent = envContent.replace(/^MONGO_URI=.*$/m, `MONGO_URI=${newUri}`);
    } else {
      envContent = `${envContent.trim()}\nMONGO_URI=${newUri}\n`;
    }
  } else {
    const port = process.env.PORT || 3000;
    envContent = `PORT=${port}\nMONGO_URI=${newUri}\n`;
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  process.env.MONGO_URI = newUri;
};

export const connectDB = async (customUri) => {
  const uri = (customUri || process.env.MONGO_URI || '').trim();

  if (!uri) {
    lastConnectionError = 'No se ha configurado MONGO_URI todavía.';
    console.warn(
      '[MongoDB Atlas] MONGO_URI está vacío. Configúralo en .env o desde el botón "Configurar Atlas" en la interfaz web.'
    );
    return { connected: false, error: lastConnectionError };
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(uri, {
      dbName: 'biocaqueta_db',
      serverSelectionTimeoutMS: 8000,
    });

    lastConnectionError = null;
    if (customUri) {
      saveUriToEnvFile(uri);
    }

    console.log(
      `[MongoDB Atlas] Conectado exitosamente a la base de datos "${mongoose.connection.name}" (${mongoose.connection.host})`
    );
    return { connected: true, error: null };
  } catch (error) {
    lastConnectionError = error.message;
    console.error('[MongoDB Atlas] Error de conexión:', error.message);
    return { connected: false, error: error.message };
  }
};

export const getConnectionStatus = () => {
  const readyState = mongoose.connection.readyState;
  const states = {
    0: 'Desconectado',
    1: 'Conectado',
    2: 'Conectando...',
    3: 'Desconectando...',
  };

  return {
    connected: readyState === 1,
    readyState,
    stateText: states[readyState] || 'Desconocido',
    dbName: mongoose.connection.name || 'biocaqueta_db',
    host: mongoose.connection.host || null,
    maskedUri: maskMongoUri(process.env.MONGO_URI),
    hasUri: Boolean(process.env.MONGO_URI && process.env.MONGO_URI.trim()),
    lastError: lastConnectionError,
  };
};
