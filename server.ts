import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createTransaksiRecord,
  deleteSantriRecord,
  deleteUserRecord,
  DomainError,
  getBootstrapData,
  getOrCreateUser,
  saveSantriRecord,
  saveSettings,
  saveUserRecord,
} from './src/db/repository.ts';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '2mb' }));

async function resolveCurrentUser(req: AuthRequest) {
  if (!req.user?.uid) {
    throw new DomainError('Sesi pengguna tidak valid.', 401);
  }
  const userRecord = await getOrCreateUser(
    req.user.uid,
    req.user.email || '',
    req.user.name
  );
  if (userRecord.status !== 'aktif') {
    throw new DomainError('Akun petugas Anda berstatus nonaktif. Hubungi Administrator.', 403);
  }
  return userRecord;
}

function handleError(res: express.Response, error: unknown, fallbackMessage: string) {
  if (error instanceof DomainError) {
    res.status(error.statusCode).json({ ok: false, error: error.message });
    return;
  }
  const msg = error instanceof Error ? error.message : fallbackMessage;
  res.status(500).json({ ok: false, error: msg });
}

app.get('/api/bootstrap', requireAuth, async (req: AuthRequest, res) => {
  try {
    const currentUser = await resolveCurrentUser(req);
    const data = await getBootstrapData(currentUser);
    res.json({ ok: true, ...data });
  } catch (error) {
    handleError(res, error, 'Gagal memuat data aplikasi.');
  }
});

app.post('/api/transaksi', requireAuth, async (req: AuthRequest, res) => {
  try {
    const currentUser = await resolveCurrentUser(req);
    const result = await createTransaksiRecord(req.body || {}, {
      id: Number(currentUser.id),
      nama_petugas: currentUser.nama_petugas,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    handleError(res, error, 'Gagal memproses transaksi.');
  }
});

app.post('/api/santri', requireAuth, async (req: AuthRequest, res) => {
  try {
    const currentUser = await resolveCurrentUser(req);
    if (currentUser.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'Akses ditolak. Hanya Admin yang dapat mengubah data santri.' });
      return;
    }
    const { mode, santri: santriPayload } = req.body || {};
    const list = await saveSantriRecord(mode === 'create' ? 'create' : 'update', santriPayload || {}, {
      id: Number(currentUser.id),
      nama_petugas: currentUser.nama_petugas,
    });
    res.json({ ok: true, santri: list });
  } catch (error) {
    handleError(res, error, 'Gagal menyimpan data santri.');
  }
});

app.delete('/api/santri/:nis', requireAuth, async (req: AuthRequest, res) => {
  try {
    const currentUser = await resolveCurrentUser(req);
    if (currentUser.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'Akses ditolak. Hanya Admin yang dapat menghapus data santri.' });
      return;
    }
    const nisParam = Array.isArray(req.params.nis) ? req.params.nis[0] : req.params.nis;
    const list = await deleteSantriRecord(String(nisParam || ''), {
      id: Number(currentUser.id),
      nama_petugas: currentUser.nama_petugas,
    });
    res.json({ ok: true, santri: list });
  } catch (error) {
    handleError(res, error, 'Gagal menghapus data santri.');
  }
});

app.post('/api/users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const currentUser = await resolveCurrentUser(req);
    if (currentUser.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'Akses ditolak. Hanya Admin yang dapat mengelola pengguna.' });
      return;
    }
    const { mode, user: userPayload } = req.body || {};
    const list = await saveUserRecord(mode === 'create' ? 'create' : 'update', userPayload || {}, {
      id: Number(currentUser.id),
      nama_petugas: currentUser.nama_petugas,
    });
    res.json({ ok: true, users: list });
  } catch (error) {
    handleError(res, error, 'Gagal menyimpan data pengguna.');
  }
});

app.delete('/api/users/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const currentUser = await resolveCurrentUser(req);
    if (currentUser.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'Akses ditolak. Hanya Admin yang dapat menghapus pengguna.' });
      return;
    }
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const list = await deleteUserRecord(Number(idParam), {
      id: Number(currentUser.id),
      nama_petugas: currentUser.nama_petugas,
    });
    res.json({ ok: true, users: list });
  } catch (error) {
    handleError(res, error, 'Gagal menghapus pengguna.');
  }
});

app.post('/api/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const currentUser = await resolveCurrentUser(req);
    if (currentUser.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'Akses ditolak. Hanya Admin yang dapat mengubah identitas lembaga.' });
      return;
    }
    const updated = await saveSettings(req.body?.settings || {}, {
      id: Number(currentUser.id),
      nama_petugas: currentUser.nama_petugas,
    });
    res.json({ ok: true, settings: updated });
  } catch (error) {
    handleError(res, error, 'Gagal menyimpan pengaturan lembaga.');
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
