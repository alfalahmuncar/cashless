/**
 * ============================================================================
 * SISTEM INFORMASI CASHLESS LEMBAGA / PONDOK PESANTREN
 * Backend Google Apps Script (Web App API / JSON Endpoint)
 * Versi: 1.3.0
 * ============================================================================
 * Struktur Sheet:
 * 1. users      : id | username | password | nama_petugas | role | status
 * 2. santri     : nis | rfid_uid | nama_santri | kelas | saldo | limit_harian | status
 * 3. transaksi  : id_transaksi | tanggal_waktu | nis | nama_santri | jenis_transaksi | nominal | saldo_akhir | petugas | keterangan
 * 4. log_sistem : id_log | waktu | pengguna | aksi | detail
 * 5. pengaturan : key | value
 * ============================================================================
 */

var APP_VERSION = "1.3.0";
var TIMEZONE = "Asia/Jakarta";

var SHEET_NAMES = {
  USERS: "users",
  SANTRI: "santri",
  TRANSAKSI: "transaksi",
  LOG: "log_sistem",
  SETTINGS: "pengaturan"
};

var HEADERS = {
  users: ["id", "username", "password", "nama_petugas", "role", "status"],
  santri: ["nis", "rfid_uid", "nama_santri", "kelas", "saldo", "limit_harian", "status"],
  transaksi: ["id_transaksi", "tanggal_waktu", "nis", "nama_santri", "jenis_transaksi", "nominal", "saldo_akhir", "petugas", "keterangan"],
  log_sistem: ["id_log", "waktu", "pengguna", "aksi", "detail"],
  pengaturan: ["key", "value"]
};

var DEFAULT_SETTINGS = {
  nama_lembaga: "PPM Al-Azhar Muncar",
  subjudul_aplikasi: "Aplikasi Sistem Informasi Cashless",
  alamat: "Banyuwangi, Jawa Timur",
  kota: "Banyuwangi Jawa Timur",
  telepon: "",
  email_website: "",
  nama_unit: "Koperasi & Kantin Santri",
  footer_struk: "Terima kasih · Simpan sebagai bukti transaksi sah",
  logo_url: ""
};

/**
 * Menu kustom di Google Spreadsheet untuk inisialisasi database cepat
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Sistem Cashless")
    .addItem("Inisialisasi / Cek Struktur Sheet", "setupDatabase")
    .addToUi();
}

/**
 * Handler HTTP GET (Cek status API / ping / read ringan)
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";

    if (action === "ping") {
      return jsonResponse({
        ok: true,
        status: "Online / Ready",
        app: "Sistem Informasi Cashless",
        version: APP_VERSION,
        serverTime: getNowIso_(),
        serverTimeFormatted: formatDateTime_(new Date())
      });
    }

    if (action === "init") {
      setupDatabase();
      return jsonResponse({
        ok: true,
        message: "Database berhasil diinisialisasi.",
        serverTime: getNowIso_()
      });
    }

    if (action === "settings") {
      ensureSheets_();
      return jsonResponse({
        ok: true,
        settings: readSettings_(),
        serverTime: getNowIso_()
      });
    }

    if (action === "santri") {
      ensureSheets_();
      return jsonResponse({
        ok: true,
        santri: readAllSantri_(),
        serverTime: getNowIso_()
      });
    }

    return jsonResponse({
      ok: true,
      message: "Endpoint aktif. Gunakan POST untuk operasi aplikasi.",
      version: APP_VERSION,
      serverTime: getNowIso_()
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message || String(err) });
  }
}

/**
 * Handler HTTP POST (Menggunakan text/plain untuk menghindari preflight CORS di Blogger)
 */
function doPost(e) {
  try {
    ensureSheets_();

    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var payload = JSON.parse(raw);
    var action = payload.action || "";

    switch (action) {
      case "ping":
        return jsonResponse({
          ok: true,
          status: "Online / Ready",
          version: APP_VERSION,
          settings: readSettings_(),
          serverTime: getNowIso_(),
          serverTimeFormatted: formatDateTime_(new Date())
        });

      case "init":
        setupDatabase();
        return jsonResponse({
          ok: true,
          message: "Struktur sheet & data awal siap.",
          serverTime: getNowIso_()
        });

      case "getSettings":
        return jsonResponse({
          ok: true,
          settings: readSettings_(),
          serverTime: getNowIso_()
        });

      case "saveSettings":
        return handleSaveSettings_(payload);

      case "login":
        return handleLogin_(payload);

      case "getBootstrap":
        return handleGetBootstrap_(payload);

      case "getSantri":
        return jsonResponse({
          ok: true,
          santri: readAllSantri_(),
          serverTime: getNowIso_()
        });

      case "getTransaksi":
        return jsonResponse({
          ok: true,
          transaksi: readAllTransaksi_(payload.limit || 250),
          serverTime: getNowIso_()
        });

      case "createTransaksi":
        return handleCreateTransaksi_(payload);

      case "saveSantri":
        return handleSaveSantri_(payload);

      case "deleteSantri":
        return handleDeleteSantri_(payload);

      case "saveUser":
        return handleSaveUser_(payload);

      case "deleteUser":
        return handleDeleteUser_(payload);

      default:
        return jsonResponse({ ok: false, error: "Action tidak dikenali: " + action });
    }
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: err.message || "Terjadi kesalahan pada server Apps Script."
    });
  }
}

/**
 * Inisialisasi sheet dan data default (Admin, Kasir, dan contoh Santri)
 */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets_();

  var userSheet = ss.getSheetByName(SHEET_NAMES.USERS);
  if (userSheet.getLastRow() <= 1) {
    userSheet.appendRow(["USR-001", "admin", "admin123", "Administrator Pondok", "admin", "aktif"]);
    userSheet.appendRow(["USR-002", "kasir", "kasir123", "Petugas Kantin Putra", "kasir", "aktif"]);
  }

  var santriSheet = ss.getSheetByName(SHEET_NAMES.SANTRI);
  if (santriSheet.getLastRow() <= 1) {
    santriSheet.appendRow(["2026001", "0014829104", "Ahmad Fauzi", "XI MA", 150000, 25000, "aktif"]);
    santriSheet.appendRow(["2026002", "0014829105", "Siti Nurhaliza", "X MTs", 85000, 20000, "aktif"]);
    santriSheet.appendRow(["2026003", "0014829106", "Muhammad Rizky", "XII MA", 220000, 30000, "aktif"]);
  }

  var settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (settingsSheet.getLastRow() <= 1) {
    var defKeys = Object.keys(DEFAULT_SETTINGS);
    for (var k = 0; k < defKeys.length; k++) {
      settingsSheet.appendRow([defKeys[k], DEFAULT_SETTINGS[defKeys[k]]]);
    }
  }

  appendLog_("SYSTEM", "INIT_DB", "Inisialisasi struktur database dan data default.");
}

/* ============================================================================
 * HANDLER BISNIS LOGIC
 * ========================================================================== */

function handleLogin_(payload) {
  var username = String(payload.username || "").trim().toLowerCase();
  var password = String(payload.password || "").trim();
  var requestedRole = String(payload.role || "").trim().toLowerCase();

  if (!username || !password) {
    return jsonResponse({ ok: false, error: "Username dan password wajib diisi." });
  }

  var users = readRowsAsObjects_(SHEET_NAMES.USERS);
  var found = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username).trim().toLowerCase() === username) {
      found = users[i];
      break;
    }
  }

  if (!found || String(found.password) !== password) {
    appendLog_(username || "UNKNOWN", "LOGIN_GAGAL", "Kredensial tidak cocok.");
    return jsonResponse({ ok: false, error: "Username atau password salah." });
  }

  if (String(found.status).trim().toLowerCase() !== "aktif") {
    return jsonResponse({ ok: false, error: "Akun petugas berstatus nonaktif. Hubungi Admin." });
  }

  var userRole = String(found.role).trim().toLowerCase();
  if (requestedRole && userRole !== requestedRole) {
    return jsonResponse({
      ok: false,
      error: "Hak akses tidak sesuai. Akun ini terdaftar sebagai '" + found.role + "', bukan '" + requestedRole + "'."
    });
  }

  appendLog_(found.nama_petugas, "LOGIN", "Login berhasil sebagai " + found.role);

  return jsonResponse({
    ok: true,
    user: {
      id: found.id,
      username: found.username,
      nama_petugas: found.nama_petugas,
      role: userRole,
      status: found.status
    },
    serverTime: getNowIso_(),
    serverTimeFormatted: formatDateTime_(new Date())
  });
}

function handleGetBootstrap_(payload) {
  var role = String(payload.role || "kasir").toLowerCase();
  var santri = readAllSantri_();
  var transaksi = readAllTransaksi_(500);
  var spentTodayMap = computeSpentTodayMap_(transaksi);

  // Sisipkan info terpakai hari ini ke masing-masing objek santri
  for (var i = 0; i < santri.length; i++) {
    santri[i].terpakai_hari_ini = spentTodayMap[santri[i].nis] || 0;
  }

  var result = {
    ok: true,
    santri: santri,
    transaksi: transaksi,
    settings: readSettings_(),
    serverTime: getNowIso_(),
    serverTimeFormatted: formatDateTime_(new Date())
  };

  if (role === "admin") {
    var users = readRowsAsObjects_(SHEET_NAMES.USERS);
    var safeUsers = [];
    for (var u = 0; u < users.length; u++) {
      safeUsers.push({
        id: users[u].id,
        username: users[u].username,
        nama_petugas: users[u].nama_petugas,
        role: users[u].role,
        status: users[u].status
      });
    }
    result.users = safeUsers;
    result.logs = readAllLogs_(150);
  }

  return jsonResponse(result);
}

function handleCreateTransaksi_(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var nisInput = String(payload.nis || "").trim();
    var rfidInput = String(payload.rfid_uid || "").trim();
    var jenis = String(payload.jenis_transaksi || "").trim();
    var nominal = Number(payload.nominal || 0);
    var petugas = String(payload.petugas || "Petugas").trim();
    var keterangan = String(payload.keterangan || "").trim();

    if (!nisInput && !rfidInput) {
      return jsonResponse({ ok: false, error: "NIS atau RFID UID santri wajib diisi." });
    }
    if (["Top Up", "Belanja", "Tarik Tunai"].indexOf(jenis) === -1) {
      return jsonResponse({ ok: false, error: "Jenis transaksi tidak valid." });
    }
    if (!nominal || isNaN(nominal) || nominal <= 0) {
      return jsonResponse({ ok: false, error: "Nominal transaksi harus lebih dari Rp 0." });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var santriSheet = ss.getSheetByName(SHEET_NAMES.SANTRI);
    var data = santriSheet.getDataRange().getValues();
    var rowIndex = -1;
    var santriObj = null;

    for (var i = 1; i < data.length; i++) {
      var rowNis = String(data[i][0]).trim();
      var rowRfid = String(data[i][1]).trim();
      if ((nisInput && rowNis === nisInput) || (rfidInput && rowRfid === rfidInput)) {
        rowIndex = i + 1; // 1-indexed sheet row
        santriObj = {
          nis: rowNis,
          rfid_uid: rowRfid,
          nama_santri: String(data[i][2]),
          kelas: String(data[i][3]),
          saldo: Number(data[i][4] || 0),
          limit_harian: Number(data[i][5] || 0),
          status: String(data[i][6] || "aktif").toLowerCase()
        };
        break;
      }
    }

    if (!santriObj) {
      return jsonResponse({ ok: false, error: "Data santri / kartu RFID tidak ditemukan." });
    }
    if (santriObj.status !== "aktif") {
      return jsonResponse({ ok: false, error: "Kartu santri " + santriObj.nama_santri + " berstatus NONAKTIF / DIBLOKIR." });
    }

    var allTrx = readAllTransaksi_(1000);
    var spentTodayMap = computeSpentTodayMap_(allTrx);
    var spentToday = spentTodayMap[santriObj.nis] || 0;
    var saldoAkhir = santriObj.saldo;

    if (jenis === "Belanja") {
      if (santriObj.saldo < nominal) {
        return jsonResponse({
          ok: false,
          error: "Saldo tidak mencukupi. Sisa saldo: Rp " + formatNumber_(santriObj.saldo)
        });
      }
      if (santriObj.limit_harian > 0 && (spentToday + nominal) > santriObj.limit_harian) {
        var sisaLimit = Math.max(0, santriObj.limit_harian - spentToday);
        return jsonResponse({
          ok: false,
          error: "Melebihi limit belanja harian (Rp " + formatNumber_(santriObj.limit_harian) + "). Terpakai hari ini: Rp " + formatNumber_(spentToday) + ", Sisa limit: Rp " + formatNumber_(sisaLimit)
        });
      }
      saldoAkhir = santriObj.saldo - nominal;
      spentToday += nominal;
    } else if (jenis === "Tarik Tunai") {
      if (santriObj.saldo < nominal) {
        return jsonResponse({
          ok: false,
          error: "Saldo tidak mencukupi untuk tarik tunai. Sisa saldo: Rp " + formatNumber_(santriObj.saldo)
        });
      }
      saldoAkhir = santriObj.saldo - nominal;
    } else if (jenis === "Top Up") {
      saldoAkhir = santriObj.saldo + nominal;
    }

    // Update saldo di sheet santri (kolom ke-5 = index 5)
    santriSheet.getRange(rowIndex, 5).setValue(saldoAkhir);

    var now = new Date();
    var idTrx = "TRX-" + Utilities.formatDate(now, TIMEZONE, "yyyyMMddHHmmss") + "-" + Math.floor(100 + Math.random() * 900);
    var waktuStr = formatDateTime_(now);
    var trxSheet = ss.getSheetByName(SHEET_NAMES.TRANSAKSI);

    trxSheet.appendRow([
      idTrx,
      waktuStr,
      santriObj.nis,
      santriObj.nama_santri,
      jenis,
      nominal,
      saldoAkhir,
      petugas,
      keterangan || "-"
    ]);

    appendLog_(petugas, "TRANSAKSI_" + jenis.toUpperCase().replace(/\s+/g, "_"),
      idTrx + " | " + santriObj.nis + " (" + santriObj.nama_santri + ") | Rp " + formatNumber_(nominal));

    santriObj.saldo = saldoAkhir;
    santriObj.terpakai_hari_ini = spentToday;

    return jsonResponse({
      ok: true,
      transaksi: {
        id_transaksi: idTrx,
        tanggal_waktu: waktuStr,
        nis: santriObj.nis,
        nama_santri: santriObj.nama_santri,
        jenis_transaksi: jenis,
        nominal: nominal,
        saldo_akhir: saldoAkhir,
        petugas: petugas,
        keterangan: keterangan || "-"
      },
      santri: santriObj,
      serverTime: getNowIso_()
    });
  } finally {
    lock.releaseLock();
  }
}

function handleSaveSantri_(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var mode = payload.mode || "create";
    var s = payload.santri || {};
    var petugas = payload.petugas || "Admin";
    var nis = String(s.nis || "").trim();
    var rfid = String(s.rfid_uid || "").trim();
    var nama = String(s.nama_santri || "").trim();
    var kelas = String(s.kelas || "").trim();
    var saldo = Number(s.saldo || 0);
    var limitHarian = Number(s.limit_harian || 0);
    var status = String(s.status || "aktif").trim().toLowerCase();

    if (!nis || !nama) {
      return jsonResponse({ ok: false, error: "NIS dan Nama Santri wajib diisi." });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAMES.SANTRI);
    var rows = sheet.getDataRange().getValues();
    var existingRow = -1;

    for (var i = 1; i < rows.length; i++) {
      var rNis = String(rows[i][0]).trim();
      var rRfid = String(rows[i][1]).trim();
      if (rNis === nis) {
        existingRow = i + 1;
      } else if (rfid && rRfid === rfid) {
        return jsonResponse({ ok: false, error: "RFID UID " + rfid + " sudah digunakan oleh santri lain (" + rows[i][2] + ")." });
      }
    }

    if (mode === "create") {
      if (existingRow !== -1) {
        return jsonResponse({ ok: false, error: "NIS " + nis + " sudah terdaftar." });
      }
      sheet.appendRow([nis, rfid, nama, kelas, saldo, limitHarian, status]);
      appendLog_(petugas, "TAMBAH_SANTRI", nis + " - " + nama);
    } else {
      if (existingRow === -1) {
        return jsonResponse({ ok: false, error: "Data santri dengan NIS " + nis + " tidak ditemukan." });
      }
      sheet.getRange(existingRow, 1, 1, 7).setValues([[nis, rfid, nama, kelas, saldo, limitHarian, status]]);
      appendLog_(petugas, "UBAH_SANTRI", nis + " - " + nama);
    }

    return jsonResponse({ ok: true, santri: readAllSantri_(), serverTime: getNowIso_() });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteSantri_(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var nis = String(payload.nis || "").trim();
    var petugas = payload.petugas || "Admin";
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.SANTRI);
    var rows = sheet.getDataRange().getValues();

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === nis) {
        var nama = rows[i][2];
        sheet.deleteRow(i + 1);
        appendLog_(petugas, "HAPUS_SANTRI", nis + " - " + nama);
        return jsonResponse({ ok: true, santri: readAllSantri_(), serverTime: getNowIso_() });
      }
    }
    return jsonResponse({ ok: false, error: "NIS tidak ditemukan." });
  } finally {
    lock.releaseLock();
  }
}

function handleSaveUser_(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var mode = payload.mode || "create";
    var u = payload.user || {};
    var petugas = payload.petugas || "Admin";
    var id = String(u.id || "").trim();
    var username = String(u.username || "").trim();
    var password = String(u.password || "").trim();
    var nama = String(u.nama_petugas || "").trim();
    var role = String(u.role || "kasir").trim().toLowerCase();
    var status = String(u.status || "aktif").trim().toLowerCase();

    if (!username || !nama) {
      return jsonResponse({ ok: false, error: "Username dan Nama Petugas wajib diisi." });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    var rows = sheet.getDataRange().getValues();
    var existingRow = -1;
    var currentPassword = "";

    for (var i = 1; i < rows.length; i++) {
      var rId = String(rows[i][0]).trim();
      var rUser = String(rows[i][1]).trim().toLowerCase();
      if (mode === "update" && rId === id) {
        existingRow = i + 1;
        currentPassword = String(rows[i][2]);
      } else if (rUser === username.toLowerCase()) {
        return jsonResponse({ ok: false, error: "Username '" + username + "' sudah terdaftar." });
      }
    }

    if (mode === "create") {
      if (!password) {
        return jsonResponse({ ok: false, error: "Password wajib diisi untuk pengguna baru." });
      }
      var newId = id || ("USR-" + String(Date.now()).slice(-5));
      sheet.appendRow([newId, username, password, nama, role, status]);
      appendLog_(petugas, "TAMBAH_USER", username + " (" + role + ")");
    } else {
      if (existingRow === -1) {
        return jsonResponse({ ok: false, error: "Pengguna tidak ditemukan." });
      }
      var finalPass = password || currentPassword;
      sheet.getRange(existingRow, 1, 1, 6).setValues([[id, username, finalPass, nama, role, status]]);
      appendLog_(petugas, "UBAH_USER", username + " (" + role + ")");
    }

    var allUsers = readRowsAsObjects_(SHEET_NAMES.USERS).map(function (item) {
      return {
        id: item.id,
        username: item.username,
        nama_petugas: item.nama_petugas,
        role: item.role,
        status: item.status
      };
    });
    return jsonResponse({ ok: true, users: allUsers, serverTime: getNowIso_() });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteUser_(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var id = String(payload.id || "").trim();
    var petugas = payload.petugas || "Admin";
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    var rows = sheet.getDataRange().getValues();

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === id) {
        if (String(rows[i][1]).toLowerCase() === "admin") {
          return jsonResponse({ ok: false, error: "Akun utama 'admin' tidak dapat dihapus." });
        }
        var uname = rows[i][1];
        sheet.deleteRow(i + 1);
        appendLog_(petugas, "HAPUS_USER", uname);
        var allUsers = readRowsAsObjects_(SHEET_NAMES.USERS).map(function (item) {
          return {
            id: item.id,
            username: item.username,
            nama_petugas: item.nama_petugas,
            role: item.role,
            status: item.status
          };
        });
        return jsonResponse({ ok: true, users: allUsers, serverTime: getNowIso_() });
      }
    }
    return jsonResponse({ ok: false, error: "Pengguna tidak ditemukan." });
  } finally {
    lock.releaseLock();
  }
}

function handleSaveSettings_(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var incoming = payload.settings || {};
    var petugas = String(payload.petugas || "Admin").trim();
    var logoVal = String(incoming.logo_url || "").trim();

    if (logoVal.length > 48000) {
      return jsonResponse({
        ok: false,
        error: "Ukuran file logo terlalu besar untuk Google Sheets. Gunakan gambar lebih kecil atau URL gambar."
      });
    }

    var allowedKeys = Object.keys(DEFAULT_SETTINGS);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
    var rows = sheet.getDataRange().getValues();
    var rowMap = {};

    for (var i = 1; i < rows.length; i++) {
      var k = String(rows[i][0] || "").trim();
      if (k) rowMap[k] = i + 1;
    }

    for (var idx = 0; idx < allowedKeys.length; idx++) {
      var key = allowedKeys[idx];
      if (incoming[key] === undefined) continue;
      var val = String(incoming[key] == null ? "" : incoming[key]).trim();
      if (key === "nama_lembaga" && !val) val = DEFAULT_SETTINGS.nama_lembaga;
      if (rowMap[key]) {
        sheet.getRange(rowMap[key], 2).setValue(val);
      } else {
        sheet.appendRow([key, val]);
      }
    }

    appendLog_(petugas, "UBAH_PENGATURAN_LEMBAGA", String(incoming.nama_lembaga || ""));

    return jsonResponse({
      ok: true,
      settings: readSettings_(),
      serverTime: getNowIso_()
    });
  } finally {
    lock.releaseLock();
  }
}

/* ============================================================================
 * HELPER FUNCTIONS
 * ========================================================================== */

function ensureSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var keys = Object.keys(HEADERS);
  for (var i = 0; i < keys.length; i++) {
    var name = keys[i];
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(HEADERS[name]);
      sheet.getRange(1, 1, 1, HEADERS[name].length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS[name]);
      sheet.getRange(1, 1, 1, HEADERS[name].length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }
}

function readRowsAsObjects_(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    var empty = true;
    for (var j = 0; j < headers.length; j++) {
      var val = values[i][j];
      if (val !== "" && val !== null && val !== undefined) empty = false;
      obj[String(headers[j]).trim()] = val;
    }
    if (!empty) list.push(obj);
  }
  return list;
}

function readSettings_() {
  var out = {};
  var defKeys = Object.keys(DEFAULT_SETTINGS);
  for (var i = 0; i < defKeys.length; i++) {
    out[defKeys[i]] = DEFAULT_SETTINGS[defKeys[i]];
  }
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.SETTINGS);
  if (!sheet || sheet.getLastRow() <= 1) return out;
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    var key = String(values[r][0] || "").trim();
    if (key && DEFAULT_SETTINGS.hasOwnProperty(key)) {
      out[key] = String(values[r][1] == null ? "" : values[r][1]);
    }
  }
  return out;
}

function readAllSantri_() {
  return readRowsAsObjects_(SHEET_NAMES.SANTRI).map(function (s) {
    return {
      nis: String(s.nis || "").trim(),
      rfid_uid: String(s.rfid_uid || "").trim(),
      nama_santri: String(s.nama_santri || ""),
      kelas: String(s.kelas || ""),
      saldo: Number(s.saldo || 0),
      limit_harian: Number(s.limit_harian || 0),
      status: String(s.status || "aktif").toLowerCase()
    };
  });
}

function readAllTransaksi_(limit) {
  var rows = readRowsAsObjects_(SHEET_NAMES.TRANSAKSI);
  var formatted = [];
  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    var waktu = r.tanggal_waktu;
    if (waktu instanceof Date) {
      waktu = formatDateTime_(waktu);
    } else {
      waktu = String(waktu || "");
    }
    formatted.push({
      id_transaksi: String(r.id_transaksi || ""),
      tanggal_waktu: waktu,
      nis: String(r.nis || "").trim(),
      nama_santri: String(r.nama_santri || ""),
      jenis_transaksi: String(r.jenis_transaksi || ""),
      nominal: Number(r.nominal || 0),
      saldo_akhir: Number(r.saldo_akhir || 0),
      petugas: String(r.petugas || ""),
      keterangan: String(r.keterangan || "")
    });
    if (limit && formatted.length >= limit) break;
  }
  return formatted;
}

function readAllLogs_(limit) {
  var rows = readRowsAsObjects_(SHEET_NAMES.LOG);
  var out = [];
  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    var waktu = r.waktu instanceof Date ? formatDateTime_(r.waktu) : String(r.waktu || "");
    out.push({
      id_log: String(r.id_log || ""),
      waktu: waktu,
      pengguna: String(r.pengguna || ""),
      aksi: String(r.aksi || ""),
      detail: String(r.detail || "")
    });
    if (limit && out.length >= limit) break;
  }
  return out;
}

function computeSpentTodayMap_(transaksiList) {
  var todayPrefix = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
  var map = {};
  for (var i = 0; i < transaksiList.length; i++) {
    var t = transaksiList[i];
    if (t.jenis_transaksi === "Belanja" && String(t.tanggal_waktu).indexOf(todayPrefix) === 0) {
      map[t.nis] = (map[t.nis] || 0) + Number(t.nominal || 0);
    }
  }
  return map;
}

function appendLog_(pengguna, aksi, detail) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.LOG);
    if (!sheet) return;
    var now = new Date();
    var idLog = "LOG-" + Utilities.formatDate(now, TIMEZONE, "yyyyMMddHHmmss") + "-" + Math.floor(10 + Math.random() * 89);
    sheet.appendRow([idLog, formatDateTime_(now), pengguna, aksi, detail]);
  } catch (e) {
    // Abaikan error log agar tidak mengganggu transaksi utama
  }
}

function formatDateTime_(d) {
  return Utilities.formatDate(d, TIMEZONE, "yyyy-MM-dd HH:mm:ss");
}

function getNowIso_() {
  return new Date().toISOString();
}

function formatNumber_(num) {
  return Number(num || 0).toLocaleString("id-ID");
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
