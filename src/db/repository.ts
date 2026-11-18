import { desc, eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { logSistem, pengaturan, santri, transaksi, users } from './schema.ts';

export class DomainError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface InstitutionSettingsDto {
  nama_lembaga: string;
  subjudul_aplikasi: string;
  alamat: string;
  kota: string;
  telepon: string;
  email_website: string;
  nama_unit: string;
  footer_struk: string;
  logo_url: string;
}

export const DEFAULT_INSTITUTION_SETTINGS: InstitutionSettingsDto = {
  nama_lembaga: 'PPM Al-Azhar Muncar',
  subjudul_aplikasi: 'Aplikasi Sistem Informasi Cashless',
  alamat: 'Banyuwangi, Jawa Timur',
  kota: 'Banyuwangi Jawa Timur',
  telepon: '',
  email_website: '',
  nama_unit: 'Koperasi & Kantin Santri',
  footer_struk: 'Terima kasih · Simpan sebagai bukti transaksi sah',
  logo_url: '',
};

function formatDateTimeNow(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? '0' + n : String(n));
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function getTodayPrefix(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? '0' + n : String(n));
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function formatRupiah(num: number): string {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

function mapUserDto(row: typeof users.$inferSelect) {
  return {
    id: String(row.id),
    uid: row.uid,
    email: row.email,
    username: row.username,
    nama_petugas: row.namaPetugas,
    role: row.role as 'admin' | 'kasir',
    status: row.status as 'aktif' | 'nonaktif',
  };
}

function mapSantriDto(row: typeof santri.$inferSelect, spentToday = 0) {
  return {
    nis: row.nis,
    rfid_uid: row.rfidUid,
    nama_santri: row.namaSantri,
    kelas: row.kelas,
    saldo: row.saldo,
    limit_harian: row.limitHarian,
    status: row.status as 'aktif' | 'nonaktif',
    terpakai_hari_ini: spentToday,
  };
}

function mapTransaksiDto(row: typeof transaksi.$inferSelect) {
  return {
    id_transaksi: row.idTransaksi,
    tanggal_waktu: row.tanggalWaktu,
    nis: row.nis,
    nama_santri: row.namaSantri,
    jenis_transaksi: row.jenisTransaksi as 'Top Up' | 'Belanja' | 'Tarik Tunai',
    nominal: row.nominal,
    saldo_akhir: row.saldoAkhir,
    petugas: row.petugas,
    keterangan: row.keterangan,
  };
}

function mapLogDto(row: typeof logSistem.$inferSelect) {
  return {
    id_log: row.idLog,
    waktu: row.waktu,
    pengguna: row.pengguna,
    aksi: row.aksi,
    detail: row.detail,
  };
}

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const cleanEmail = (email || `${uid}@user.local`).trim().toLowerCase();
    const defaultUsername = cleanEmail.split('@')[0] || uid.slice(0, 12);
    const defaultName = (displayName || defaultUsername).trim();

    const existingByUid = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existingByUid.length > 0) {
      const updated = await db
        .insert(users)
        .values({
          uid,
          email: cleanEmail,
          username: existingByUid[0].username,
          namaPetugas: existingByUid[0].namaPetugas,
          role: existingByUid[0].role,
          status: existingByUid[0].status,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: { email: cleanEmail },
        })
        .returning();
      return mapUserDto(updated[0]);
    }

    const existingInvite = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existingInvite.length > 0 && existingInvite[0].uid.startsWith('pending:')) {
      const claimed = await db
        .update(users)
        .set({
          uid,
          namaPetugas: existingInvite[0].namaPetugas || defaultName,
        })
        .where(eq(users.id, existingInvite[0].id))
        .returning();
      return mapUserDto(claimed[0]);
    }

    const totalUsersResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    const isFirstUser = Number(totalUsersResult[0]?.count || 0) === 0;

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        username: defaultUsername,
        namaPetugas: defaultName,
        role: isFirstUser ? 'admin' : 'kasir',
        status: 'aktif',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: cleanEmail },
      })
      .returning();

    return mapUserDto(inserted[0]);
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Gagal memverifikasi akun petugas di database.', { cause: error });
  }
}

export async function readSettings(): Promise<InstitutionSettingsDto> {
  try {
    const rows = await db.select().from(pengaturan);
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return {
      ...DEFAULT_INSTITUTION_SETTINGS,
      ...map,
    };
  } catch (error) {
    console.error('Database query failed in readSettings:', error);
    throw new Error('Gagal membaca pengaturan lembaga.', { cause: error });
  }
}

export async function saveSettings(
  input: Partial<InstitutionSettingsDto>,
  operator: { id: number; nama_petugas: string }
): Promise<InstitutionSettingsDto> {
  try {
    const logoVal = String(input.logo_url || '').trim();
    if (logoVal.length > 100000) {
      throw new DomainError('Ukuran gambar logo terlalu besar. Gunakan file yang lebih ringkas.', 400);
    }

    const merged: InstitutionSettingsDto = {
      nama_lembaga: String(input.nama_lembaga || DEFAULT_INSTITUTION_SETTINGS.nama_lembaga).trim(),
      subjudul_aplikasi: String(
        input.subjudul_aplikasi || DEFAULT_INSTITUTION_SETTINGS.subjudul_aplikasi
      ).trim(),
      alamat: String(input.alamat ?? '').trim(),
      kota: String(input.kota ?? '').trim(),
      telepon: String(input.telepon ?? '').trim(),
      email_website: String(input.email_website ?? '').trim(),
      nama_unit: String(input.nama_unit ?? '').trim(),
      footer_struk: String(input.footer_struk || DEFAULT_INSTITUTION_SETTINGS.footer_struk).trim(),
      logo_url: logoVal,
    };

    const entries = Object.entries(merged) as Array<[keyof InstitutionSettingsDto, string]>;
    await db.transaction(async (tx) => {
      for (const [key, value] of entries) {
        await tx
          .insert(pengaturan)
          .values({ key, value, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: pengaturan.key,
            set: { value, updatedAt: new Date() },
          });
      }
      await tx.insert(logSistem).values({
        idLog: `LOG-${Date.now().toString().slice(-8)}`,
        waktu: formatDateTimeNow(),
        pengguna: operator.nama_petugas,
        aksi: 'UBAH_PENGATURAN_LEMBAGA',
        detail: merged.nama_lembaga,
        operatorUserId: operator.id,
      });
    });

    return merged;
  } catch (error) {
    if (error instanceof DomainError) throw error;
    console.error('Database query failed in saveSettings:', error);
    throw new Error('Gagal menyimpan pengaturan lembaga.', { cause: error });
  }
}

export async function getBootstrapData(currentUser: ReturnType<typeof mapUserDto>) {
  try {
    const [santriRows, trxRows, settings] = await Promise.all([
      db.select().from(santri).orderBy(santri.nis),
      db.select().from(transaksi).orderBy(desc(transaksi.tanggalWaktu), desc(transaksi.createdAt)),
      readSettings(),
    ]);

    const today = getTodayPrefix();
    const spentMap: Record<string, number> = {};
    for (const t of trxRows) {
      if (t.jenisTransaksi === 'Belanja' && t.tanggalWaktu.startsWith(today)) {
        spentMap[t.nis] = (spentMap[t.nis] || 0) + Number(t.nominal || 0);
      }
    }

    const santriDto = santriRows.map((row) => mapSantriDto(row, spentMap[row.nis] || 0));
    const transaksiDto = trxRows.map(mapTransaksiDto);

    let usersDto: Array<ReturnType<typeof mapUserDto>> | undefined;
    let logsDto: Array<ReturnType<typeof mapLogDto>> | undefined;

    if (currentUser.role === 'admin') {
      const [userRows, logRows] = await Promise.all([
        db.select().from(users).orderBy(users.id),
        db.select().from(logSistem).orderBy(desc(logSistem.waktu), desc(logSistem.createdAt)).limit(200),
      ]);
      usersDto = userRows.map(mapUserDto);
      logsDto = logRows.map(mapLogDto);
    }

    return {
      currentUser,
      santri: santriDto,
      transaksi: transaksiDto,
      users: usersDto,
      logs: logsDto,
      settings,
      serverTime: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Database query failed in getBootstrapData:', error);
    throw new Error('Gagal memuat data dari database PostgreSQL.', { cause: error });
  }
}

export async function createTransaksiRecord(
  payload: {
    nis?: string;
    rfid_uid?: string;
    jenis_transaksi: 'Top Up' | 'Belanja' | 'Tarik Tunai';
    nominal: number;
    keterangan?: string;
  },
  operator: { id: number; nama_petugas: string }
) {
  try {
    const nis = String(payload.nis || '').trim();
    const rfid = String(payload.rfid_uid || '').trim();
    const jenis = payload.jenis_transaksi;
    const nominal = Math.round(Number(payload.nominal || 0));
    const keterangan = String(payload.keterangan || '-').trim() || '-';

    if (!nominal || nominal <= 0) {
      throw new DomainError('Nominal transaksi harus lebih dari Rp 0.', 400);
    }
    if (!['Top Up', 'Belanja', 'Tarik Tunai'].includes(jenis)) {
      throw new DomainError('Jenis transaksi tidak valid.', 400);
    }

    return await db.transaction(async (tx) => {
      let targetRows: Array<typeof santri.$inferSelect> = [];
      if (nis) {
        targetRows = await tx.select().from(santri).where(eq(santri.nis, nis)).limit(1);
      }
      if (targetRows.length === 0 && rfid) {
        targetRows = await tx.select().from(santri).where(eq(santri.rfidUid, rfid)).limit(1);
      }
      if (targetRows.length === 0) {
        throw new DomainError('Data santri atau kartu RFID tidak ditemukan.', 404);
      }

      const target = targetRows[0];
      if (target.status !== 'aktif') {
        throw new DomainError(`Kartu santri ${target.namaSantri} berstatus nonaktif.`, 400);
      }

      const today = getTodayPrefix();
      const allStudentTrx = await tx
        .select()
        .from(transaksi)
        .where(eq(transaksi.nis, target.nis));

      let spentToday = allStudentTrx
        .filter((t) => t.jenisTransaksi === 'Belanja' && t.tanggalWaktu.startsWith(today))
        .reduce((sum, t) => sum + Number(t.nominal || 0), 0);

      let nextSaldo = target.saldo;
      if (jenis === 'Belanja') {
        if (target.saldo < nominal) {
          throw new DomainError(`Saldo tidak mencukupi. Sisa saldo: ${formatRupiah(target.saldo)}`, 400);
        }
        if (target.limitHarian > 0 && spentToday + nominal > target.limitHarian) {
          const sisa = Math.max(0, target.limitHarian - spentToday);
          throw new DomainError(
            `Melebihi limit belanja harian (${formatRupiah(target.limitHarian)}). Sisa limit hari ini: ${formatRupiah(sisa)}`,
            400
          );
        }
        nextSaldo -= nominal;
        spentToday += nominal;
      } else if (jenis === 'Tarik Tunai') {
        if (target.saldo < nominal) {
          throw new DomainError(
            `Saldo tidak mencukupi untuk tarik tunai. Sisa saldo: ${formatRupiah(target.saldo)}`,
            400
          );
        }
        nextSaldo -= nominal;
      } else {
        nextSaldo += nominal;
      }

      const updatedSantri = await tx
        .update(santri)
        .set({ saldo: nextSaldo, updatedAt: new Date() })
        .where(eq(santri.nis, target.nis))
        .returning();

      const nowStr = formatDateTimeNow();
      const idTransaksi = `TRX-${Date.now().toString().slice(-8)}`;
      const insertedTrx = await tx
        .insert(transaksi)
        .values({
          idTransaksi,
          tanggalWaktu: nowStr,
          nis: target.nis,
          namaSantri: target.namaSantri,
          jenisTransaksi: jenis,
          nominal,
          saldoAkhir: nextSaldo,
          petugas: operator.nama_petugas,
          keterangan,
          operatorUserId: operator.id,
        })
        .returning();

      await tx.insert(logSistem).values({
        idLog: `LOG-${Date.now().toString().slice(-8)}`,
        waktu: nowStr,
        pengguna: operator.nama_petugas,
        aksi: `TRANSAKSI_${jenis.toUpperCase().replace(/\s+/g, '_')}`,
        detail: `${idTransaksi} | ${target.namaSantri} | ${formatRupiah(nominal)}`,
        operatorUserId: operator.id,
      });

      return {
        transaksi: mapTransaksiDto(insertedTrx[0]),
        santri: mapSantriDto(updatedSantri[0], spentToday),
        serverTime: new Date().toISOString(),
      };
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    console.error('Database query failed in createTransaksiRecord:', error);
    throw new Error('Gagal memproses transaksi ke database.', { cause: error });
  }
}

export async function saveSantriRecord(
  mode: 'create' | 'update',
  input: {
    nis: string;
    rfid_uid?: string;
    nama_santri: string;
    kelas: string;
    saldo: number;
    limit_harian: number;
    status: 'aktif' | 'nonaktif';
  },
  operator: { id: number; nama_petugas: string }
) {
  try {
    const nis = String(input.nis || '').trim();
    const rfidUid = String(input.rfid_uid || '').trim();
    const namaSantri = String(input.nama_santri || '').trim();
    const kelas = String(input.kelas || '').trim();
    const saldo = Math.round(Number(input.saldo || 0));
    const limitHarian = Math.max(0, Math.round(Number(input.limit_harian || 0)));
    const status = input.status === 'nonaktif' ? 'nonaktif' : 'aktif';

    if (!nis || !namaSantri || !kelas) {
      throw new DomainError('NIS, Nama Santri, dan Kelas wajib diisi.', 400);
    }

    await db.transaction(async (tx) => {
      if (mode === 'create') {
        const dupNis = await tx.select().from(santri).where(eq(santri.nis, nis)).limit(1);
        if (dupNis.length > 0) {
          throw new DomainError(`NIS ${nis} sudah terdaftar.`, 400);
        }
        if (rfidUid) {
          const dupRfid = await tx.select().from(santri).where(eq(santri.rfidUid, rfidUid)).limit(1);
          if (dupRfid.length > 0) {
            throw new DomainError(`RFID UID ${rfidUid} sudah digunakan santri lain.`, 400);
          }
        }
        await tx.insert(santri).values({
          nis,
          rfidUid,
          namaSantri,
          kelas,
          saldo,
          limitHarian,
          status,
        });
        await tx.insert(logSistem).values({
          idLog: `LOG-${Date.now().toString().slice(-8)}`,
          waktu: formatDateTimeNow(),
          pengguna: operator.nama_petugas,
          aksi: 'TAMBAH_SANTRI',
          detail: `${nis} - ${namaSantri}`,
          operatorUserId: operator.id,
        });
      } else {
        const existing = await tx.select().from(santri).where(eq(santri.nis, nis)).limit(1);
        if (existing.length === 0) {
          throw new DomainError('Data santri tidak ditemukan.', 404);
        }
        if (rfidUid) {
          const dupRfid = await tx.select().from(santri).where(eq(santri.rfidUid, rfidUid)).limit(1);
          if (dupRfid.length > 0 && dupRfid[0].nis !== nis) {
            throw new DomainError(`RFID UID ${rfidUid} sudah digunakan santri lain.`, 400);
          }
        }
        await tx
          .update(santri)
          .set({
            rfidUid,
            namaSantri,
            kelas,
            saldo,
            limitHarian,
            status,
            updatedAt: new Date(),
          })
          .where(eq(santri.nis, nis));

        await tx.insert(logSistem).values({
          idLog: `LOG-${Date.now().toString().slice(-8)}`,
          waktu: formatDateTimeNow(),
          pengguna: operator.nama_petugas,
          aksi: 'UBAH_SANTRI',
          detail: `${nis} - ${namaSantri} (Limit: ${formatRupiah(limitHarian)})`,
          operatorUserId: operator.id,
        });
      }
    });

    const today = getTodayPrefix();
    const [allSantri, todayTrx] = await Promise.all([
      db.select().from(santri).orderBy(santri.nis),
      db.select().from(transaksi),
    ]);
    const spentMap: Record<string, number> = {};
    for (const t of todayTrx) {
      if (t.jenisTransaksi === 'Belanja' && t.tanggalWaktu.startsWith(today)) {
        spentMap[t.nis] = (spentMap[t.nis] || 0) + Number(t.nominal || 0);
      }
    }
    return allSantri.map((s) => mapSantriDto(s, spentMap[s.nis] || 0));
  } catch (error) {
    if (error instanceof DomainError) throw error;
    console.error('Database query failed in saveSantriRecord:', error);
    throw new Error('Gagal menyimpan data santri.', { cause: error });
  }
}

export async function deleteSantriRecord(
  nis: string,
  operator: { id: number; nama_petugas: string }
) {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(santri).where(eq(santri.nis, nis));
      await tx.insert(logSistem).values({
        idLog: `LOG-${Date.now().toString().slice(-8)}`,
        waktu: formatDateTimeNow(),
        pengguna: operator.nama_petugas,
        aksi: 'HAPUS_SANTRI',
        detail: `Hapus NIS ${nis}`,
        operatorUserId: operator.id,
      });
    });

    const today = getTodayPrefix();
    const [allSantri, todayTrx] = await Promise.all([
      db.select().from(santri).orderBy(santri.nis),
      db.select().from(transaksi),
    ]);
    const spentMap: Record<string, number> = {};
    for (const t of todayTrx) {
      if (t.jenisTransaksi === 'Belanja' && t.tanggalWaktu.startsWith(today)) {
        spentMap[t.nis] = (spentMap[t.nis] || 0) + Number(t.nominal || 0);
      }
    }
    return allSantri.map((s) => mapSantriDto(s, spentMap[s.nis] || 0));
  } catch (error) {
    console.error('Database query failed in deleteSantriRecord:', error);
    throw new Error('Gagal menghapus data santri.', { cause: error });
  }
}

export async function saveUserRecord(
  mode: 'create' | 'update',
  input: {
    id?: string;
    email?: string;
    username: string;
    nama_petugas: string;
    role: 'admin' | 'kasir';
    status: 'aktif' | 'nonaktif';
  },
  operator: { id: number; nama_petugas: string }
) {
  try {
    const email = String(input.email || '').trim().toLowerCase();
    const username = String(input.username || '').trim();
    const namaPetugas = String(input.nama_petugas || '').trim();
    const role = input.role === 'admin' ? 'admin' : 'kasir';
    const status = input.status === 'nonaktif' ? 'nonaktif' : 'aktif';

    if (!namaPetugas || !username) {
      throw new DomainError('Username dan Nama Petugas wajib diisi.', 400);
    }

    await db.transaction(async (tx) => {
      if (mode === 'create') {
        if (!email) {
          throw new DomainError('Email Google petugas wajib diisi untuk akses login.', 400);
        }
        const dup = await tx.select().from(users).where(eq(users.email, email)).limit(1);
        if (dup.length > 0) {
          throw new DomainError(`Email "${email}" sudah terdaftar.`, 400);
        }
        await tx.insert(users).values({
          uid: `pending:${email}`,
          email,
          username,
          namaPetugas,
          role,
          status,
        });
        await tx.insert(logSistem).values({
          idLog: `LOG-${Date.now().toString().slice(-8)}`,
          waktu: formatDateTimeNow(),
          pengguna: operator.nama_petugas,
          aksi: 'TAMBAH_USER',
          detail: `${email} (${role})`,
          operatorUserId: operator.id,
        });
      } else {
        const userId = Number(input.id);
        if (!userId) throw new DomainError('ID pengguna tidak valid.', 400);
        const existing = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
        if (existing.length === 0) throw new DomainError('Pengguna tidak ditemukan.', 404);
        await tx
          .update(users)
          .set({
            username,
            namaPetugas,
            role,
            status,
            ...(email ? { email } : {}),
          })
          .where(eq(users.id, userId));
        await tx.insert(logSistem).values({
          idLog: `LOG-${Date.now().toString().slice(-8)}`,
          waktu: formatDateTimeNow(),
          pengguna: operator.nama_petugas,
          aksi: 'UBAH_USER',
          detail: `${username} (${role})`,
          operatorUserId: operator.id,
        });
      }
    });

    const rows = await db.select().from(users).orderBy(users.id);
    return rows.map(mapUserDto);
  } catch (error) {
    if (error instanceof DomainError) throw error;
    console.error('Database query failed in saveUserRecord:', error);
    throw new Error('Gagal menyimpan data pengguna.', { cause: error });
  }
}

export async function deleteUserRecord(
  targetId: number,
  operator: { id: number; nama_petugas: string }
) {
  try {
    if (targetId === operator.id) {
      throw new DomainError('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.', 400);
    }
    await db.transaction(async (tx) => {
      await tx.delete(users).where(eq(users.id, targetId));
      await tx.insert(logSistem).values({
        idLog: `LOG-${Date.now().toString().slice(-8)}`,
        waktu: formatDateTimeNow(),
        pengguna: operator.nama_petugas,
        aksi: 'HAPUS_USER',
        detail: `Hapus User ID ${targetId}`,
        operatorUserId: operator.id,
      });
    });

    const rows = await db.select().from(users).orderBy(users.id);
    return rows.map(mapUserDto);
  } catch (error) {
    if (error instanceof DomainError) throw error;
    console.error('Database query failed in deleteUserRecord:', error);
    throw new Error('Gagal menghapus data pengguna.', { cause: error });
  }
}
