import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  username: text('username').notNull(),
  namaPetugas: text('nama_petugas').notNull(),
  role: text('role').notNull().default('kasir'), // 'admin' | 'kasir'
  status: text('status').notNull().default('aktif'), // 'aktif' | 'nonaktif'
  createdAt: timestamp('created_at').defaultNow(),
});

export const santri = pgTable('santri', {
  nis: text('nis').primaryKey(),
  rfidUid: text('rfid_uid').notNull().default(''),
  namaSantri: text('nama_santri').notNull(),
  kelas: text('kelas').notNull(),
  saldo: integer('saldo').notNull().default(0),
  limitHarian: integer('limit_harian').notNull().default(0),
  status: text('status').notNull().default('aktif'), // 'aktif' | 'nonaktif'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const transaksi = pgTable('transaksi', {
  idTransaksi: text('id_transaksi').primaryKey(),
  tanggalWaktu: text('tanggal_waktu').notNull(),
  nis: text('nis').notNull(),
  namaSantri: text('nama_santri').notNull(),
  jenisTransaksi: text('jenis_transaksi').notNull(), // 'Top Up' | 'Belanja' | 'Tarik Tunai'
  nominal: integer('nominal').notNull(),
  saldoAkhir: integer('saldo_akhir').notNull(),
  petugas: text('petugas').notNull(),
  keterangan: text('keterangan').notNull().default('-'),
  operatorUserId: integer('operator_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const logSistem = pgTable('log_sistem', {
  idLog: text('id_log').primaryKey(),
  waktu: text('waktu').notNull(),
  pengguna: text('pengguna').notNull(),
  aksi: text('aksi').notNull(),
  detail: text('detail').notNull(),
  operatorUserId: integer('operator_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pengaturan = pgTable('pengaturan', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  transaksiList: many(transaksi),
  logs: many(logSistem),
}));

export const transaksiRelations = relations(transaksi, ({ one }) => ({
  operator: one(users, {
    fields: [transaksi.operatorUserId],
    references: [users.id],
  }),
}));

export const logSistemRelations = relations(logSistem, ({ one }) => ({
  operator: one(users, {
    fields: [logSistem.operatorUserId],
    references: [users.id],
  }),
}));
