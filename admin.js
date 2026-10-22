
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

/* =========================================
   KONFIGURASI FIREBASE
========================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBXO6DtfunOtP-45Zpq3yCR-QwoKeBr384",
  authDomain: "laksana-jaya.firebaseapp.com",
  projectId: "laksana-jaya",
  storageBucket: "laksana-jaya.firebasestorage.app",
  messagingSenderId: "663159568736",
  appId: "1:663159568736:web:de6e20a1427380f15c4605"
};

const ADMIN_EMAIL = "bunyamintheaa86@gmail.com";
const ADMIN_WA = "6283135335733";

const STATUSES = [
  "Menunggu konfirmasi",
  "Dikonfirmasi",
  "Sedang dikerjakan",
  "Selesai",
  "Dibatalkan"
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = selector => document.querySelector(selector);

let allOrders = [];
let allPackages = [];
let allBookings = [];
let activeOrderId = null;
let loadingOrders = false;
let loadingPackages = false;
let loadingBookings = false;

/* =========================================
   FUNGSI UMUM
========================================= */

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showMessage(element, message, type = "") {
  if (!element) return;
  element.textContent = message;
  element.className = "message" + (type ? " " + type : "");
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function phoneForWhatsApp(value) {
  let phone = String(value || "").replace(/\D/g, "");

  if (phone.startsWith("0")) {
    phone = "62" + phone.slice(1);
  } else if (phone.startsWith("8")) {
    phone = "62" + phone;
  }

  return phone;
}

function whatsappURL(phone, message) {
  return "https://wa.me/" +
    (phoneForWhatsApp(phone) || ADMIN_WA) +
    "?text=" + encodeURIComponent(message);
}

function checkAdmin() {
  return auth.currentUser &&
    auth.currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function requireAdmin() {
  if (!checkAdmin()) {
    throw new Error("Sesi admin tidak valid. Silakan login kembali.");
  }
}

/* =========================================
   LOGIN ADMIN
========================================= */

function setLoggedIn(user) {
  $("#loginPanel").hidden = !!user;
  $("#dashboardPanel").hidden = !user;

  if (user) {
    $("#adminIdentity").textContent = "Masuk sebagai " + user.email;
  }
}

function readableAuthError(code) {
  const errors = {
    "auth/invalid-credential": "Email atau kata sandi salah.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/user-not-found": "Akun admin belum dibuat di Firebase Authentication.",
    "auth/wrong-password": "Kata sandi salah.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba kembali nanti.",
    "auth/network-request-failed": "Koneksi internet bermasalah."
  };

  return errors[code] ||
    "Login gagal. Periksa akun Firebase Authentication dan konfigurasi proyek.";
}

$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  const button = $("#loginButton");
  const email = $("#email").value.trim().toLowerCase();
  const password = $("#password").value;

  showMessage($("#loginMessage"), "");

  if (email !== ADMIN_EMAIL.toLowerCase()) {
    showMessage(
      $("#loginMessage"),
      "Email ini tidak diizinkan untuk dashboard admin.",
      "error"
    );
    return;
  }

  button.disabled = true;
  button.textContent = "Memeriksa...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    showMessage($("#loginMessage"), readableAuthError(error.code), "error");
  } finally {
    button.disabled = false;
    button.textContent = "Masuk ke Dashboard";
  }
});

$("#logoutButton").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    showMessage($("#dashboardMessage"), "Gagal keluar: " + error.message, "error");
  }
});

onAuthStateChanged(auth, async user => {
  if (user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    setLoggedIn(user);

    await Promise.all([
      loadOrders(),
      loadPackages(),
      loadBookings()
    ]);
  } else {
    if (user) await signOut(auth);
    setLoggedIn(null);
  }
});

/* =========================================
   PESANAN LAYANAN LAMA
========================================= */

async function loadOrders() {
  if (loadingOrders) return;

  loadingOrders = true;
  showMessage($("#dashboardMessage"), "Memuat pesanan...");
  $("#ordersList").innerHTML =
    '<div class="empty-state">Memuat pesanan...</div>';

  try {
    requireAdmin();

    const result = await getDocs(
      query(collection(db, "pesanan"), orderBy("createdAt", "desc"))
    );

    allOrders = result.docs.map(snapshot => ({
      id: snapshot.id,
      ...snapshot.data()
    }));

    renderStats();
    renderOrders();

    showMessage(
      $("#dashboardMessage"),
      `${allOrders.length} pesanan berhasil dimuat.`,
      "success"
    );
  } catch (error) {
    console.error(error);
    showMessage(
      $("#dashboardMessage"),
      "Gagal membaca pesanan. Periksa koneksi dan Firestore Rules.",
      "error"
    );

    $("#ordersList").innerHTML =
      '<div class="empty-state">Pesanan belum dapat dimuat.</div>';
  } finally {
    loadingOrders = false;
  }
}

function renderStats() {
  $("#countAll").textContent = allOrders.length;

  $("#countPending").textContent = allOrders.filter(
    order => (order.status || "Menunggu konfirmasi") === "Menunggu konfirmasi"
  ).length;

  $("#countWorking").textContent = allOrders.filter(
    order => order.status === "Sedang dikerjakan"
  ).length;

  $("#countDone").textContent = allOrders.filter(
    order => order.status === "Selesai"
  ).length;
}

function renderOrders() {
  const term = $("#searchInput").value.trim().toLowerCase();
  const selectedStatus = $("#statusFilter").value;
  const container = $("#ordersList");

  const filtered = allOrders.filter(order => {
    const currentStatus = order.status || "Menunggu konfirmasi";
    const matchesTerm = [order.id, order.nama, order.layanan, order.telepon]
      .some(value => String(value || "").toLowerCase().includes(term));
    return matchesTerm && (!selectedStatus || currentStatus === selectedStatus);
  });

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state">Tidak ada pesanan yang cocok dengan pencarian.</div>';
    return;
  }

  container.innerHTML = renderStatusGroups(filtered, order => order.status || "Menunggu konfirmasi", order => `
    <article class="order-card compact-order-card">
      <div class="compact-card-main">
        <h3>${escapeHTML(order.layanan || "Layanan")} · ${escapeHTML(order.nama || "Pelanggan")}</h3>
        <p>No. ${escapeHTML(order.id)} <span class="compact-separator">•</span> ${escapeHTML(order.telepon || "- ")}</p>
        <span class="status-pill">${escapeHTML(order.status || "Menunggu konfirmasi")}</span>
      </div>
      <div class="order-actions compact-card-actions">
        <button class="btn btn-primary view-order" data-id="${escapeHTML(order.id)}">Detail / Status</button>
        <a class="btn btn-outline" target="_blank" rel="noopener noreferrer" href="${escapeHTML(whatsappURL(order.telepon, "Halo " + (order.nama || "") + ", kami dari Laksana Jaya Digital terkait pesanan " + order.id + "."))}">WhatsApp</a>
      </div>
    </article>
  `);

  container.querySelectorAll(".view-order").forEach(button => {
    button.addEventListener("click", () => openOrderDetail(button.dataset.id));
  });
}

function renderStatusGroups(items, getStatus, renderCard) {
  const order = ["Menunggu konfirmasi", "Dikonfirmasi", "Sedang dikerjakan", "Selesai", "Dibatalkan"];
  const statuses = [...order.filter(status => items.some(item => getStatus(item) === status)),
    ...new Set(items.map(getStatus).filter(status => !order.includes(status)))];
  return statuses.map(status => {
    const groupItems = items.filter(item => getStatus(item) === status);
    return `<section class="status-group ${status === "Menunggu konfirmasi" ? "status-group-pending" : ""}">
      <div class="status-group-heading"><h3>${escapeHTML(status)}</h3><span class="status-group-count">${groupItems.length}</span></div>
      <div class="status-group-list">${groupItems.map(renderCard).join("")}</div>
    </section>`;
  }).join("");
}

function detailLine(label, value) {
  return `<div class="detail-line">
    <small>${escapeHTML(label)}</small>
    <div>${escapeHTML(value || "-")}</div>
  </div>`;
}

function openOrderDetail(id) {
  const order = allOrders.find(item => item.id === id);
  if (!order) return;

  activeOrderId = id;

  $("#detailContent").innerHTML = [
    detailLine("Nomor pesanan", order.id),
    detailLine("Layanan", order.layanan),
    detailLine("Nama pelanggan", order.nama),
    detailLine("Nomor WhatsApp", order.telepon),
    detailLine("Tanggal dibutuhkan", order.tanggal),
    detailLine("Rincian pesanan", order.rincian),
    detailLine("Catatan tambahan", order.catatan),
    detailLine("Status sekarang", order.status || "Menunggu konfirmasi")
  ].join("");

  $("#newStatus").value = STATUSES.includes(order.status)
    ? order.status
    : "Menunggu konfirmasi";

  $("#customerWhatsApp").href = whatsappURL(
    order.telepon,
    "Halo " + (order.nama || "") +
    ", kami dari Laksana Jaya Digital terkait pesanan " + order.id + "."
  );

  showMessage($("#statusMessage"), "");
  $("#detailDialog").showModal();
}

$("#closeDialog").addEventListener("click", () => {
  $("#detailDialog").close();
});

$("#detailDialog").addEventListener("click", event => {
  if (event.target === $("#detailDialog")) {
    $("#detailDialog").close();
  }
});

$("#statusForm").addEventListener("submit", async event => {
  event.preventDefault();

  try {
    requireAdmin();

    const order = allOrders.find(item => item.id === activeOrderId);
    if (!order) throw new Error("Pesanan tidak ditemukan.");

    const status = $("#newStatus").value;
    if (!STATUSES.includes(status)) {
      throw new Error("Status tidak valid.");
    }

    const button = $("#saveStatusButton");
    button.disabled = true;
    button.textContent = "Menyimpan...";
    showMessage($("#statusMessage"), "");

    try {
      const orderRef = doc(db, "pesanan", activeOrderId);
      const orderSnapshot = await getDoc(orderRef);

      if (!orderSnapshot.exists()) {
        throw new Error("Dokumen pesanan tidak ditemukan.");
      }

      await updateDoc(orderRef, {
        status,
        updatedAt: serverTimestamp()
      });

      await setDoc(doc(db, "pelacakan", activeOrderId), {
        orderId: activeOrderId,
        layanan: order.layanan || "",
        status,
        updatedAt: serverTimestamp()
      }, { merge: true });

      order.status = status;
      renderStats();
      renderOrders();

      showMessage($("#statusMessage"), "Status berhasil diperbarui.", "success");

      $("#detailContent").innerHTML = [
        detailLine("Nomor pesanan", order.id),
        detailLine("Layanan", order.layanan),
        detailLine("Nama pelanggan", order.nama),
        detailLine("Nomor WhatsApp", order.telepon),
        detailLine("Tanggal dibutuhkan", order.tanggal),
        detailLine("Rincian pesanan", order.rincian),
        detailLine("Catatan tambahan", order.catatan),
        detailLine("Status sekarang", status)
      ].join("");
    } finally {
      button.disabled = false;
      button.textContent = "Simpan Status";
    }
  } catch (error) {
    console.error(error);
    showMessage(
      $("#statusMessage"),
      error.message || "Gagal menyimpan status pesanan.",
      "error"
    );
  }
});

$("#reloadButton").addEventListener("click", loadOrders);
$("#searchInput").addEventListener("input", renderOrders);
$("#statusFilter").addEventListener("change", renderOrders);

/* =========================================
   PAKET WEDDING ORGANIZER
   Koleksi: wo_paket
========================================= */

function resetPackageForm() {
  $("#woPackageForm").reset();
  $("#woPackageId").value = "";
  $("#woPackageActive").checked = true;
  $("#woPackageSave").textContent = "Simpan Paket";
  showMessage($("#woPackageMessage"), "");
}

function renderPackages() {
  const container = $("#woPackagesList");

  if (!allPackages.length) {
    container.innerHTML =
      '<div class="empty-state">Belum ada paket WO. Tambahkan paket melalui formulir di atas.</div>';
    return;
  }

  container.innerHTML = allPackages.map(pkg => `
    <article class="order-card">
      <div>
        <h3>${escapeHTML(pkg.nama || "Paket tanpa nama")}</h3>
        <p><strong>${escapeHTML(formatRupiah(pkg.harga))}</strong></p>
        <p>${escapeHTML(pkg.deskripsi || "Tidak ada deskripsi.")}</p>
        <p><strong>Fasilitas:</strong></p>
        <p>${escapeHTML(pkg.fasilitas || "-").replace(/\n/g, "<br>")}</p>
        <span class="status-pill">${pkg.aktif ? "Aktif" : "Nonaktif"}</span>
      </div>
      <div class="order-actions">
        <button class="btn btn-primary wo-edit-package"
          data-id="${escapeHTML(pkg.id)}">Edit</button>
        <button class="btn btn-outline wo-delete-package"
          data-id="${escapeHTML(pkg.id)}">Hapus</button>
      </div>
    </article>
  `).join("");

  container.querySelectorAll(".wo-edit-package").forEach(button => {
    button.addEventListener("click", () => editPackage(button.dataset.id));
  });

  container.querySelectorAll(".wo-delete-package").forEach(button => {
    button.addEventListener("click", () => deletePackage(button.dataset.id));
  });
}

async function loadPackages() {
  if (loadingPackages) return;

  loadingPackages = true;
  $("#woPackagesList").innerHTML =
    '<div class="empty-state">Memuat paket WO...</div>';

  try {
    requireAdmin();

    // Admin dapat melihat paket aktif maupun nonaktif.
    const result = await getDocs(collection(db, "wo_paket"));

    allPackages = result.docs.map(snapshot => ({
      id: snapshot.id,
      ...snapshot.data()
    }));

    allPackages.sort((a, b) =>
      String(a.nama || "").localeCompare(String(b.nama || ""), "id")
    );

    renderPackages();
    showMessage($("#woPackageMessage"), "Daftar paket berhasil dimuat.", "success");
  } catch (error) {
    console.error(error);
    $("#woPackagesList").innerHTML =
      '<div class="empty-state">Paket gagal dimuat. Periksa Firestore Rules.</div>';
    showMessage(
      $("#woPackageMessage"),
      "Gagal memuat paket WO. Pastikan admin sudah login dan Rules telah dipublikasikan.",
      "error"
    );
  } finally {
    loadingPackages = false;
  }
}

function editPackage(id) {
  const pkg = allPackages.find(item => item.id === id);
  if (!pkg) return;

  $("#woPackageId").value = pkg.id;
  $("#woPackageName").value = pkg.nama || "";
  $("#woPackagePrice").value = Number(pkg.harga) || 0;
  $("#woPackageFacilities").value = pkg.fasilitas || "";
  $("#woPackageDescription").value = pkg.deskripsi || "";
  $("#woPackageActive").checked = pkg.aktif === true;
  $("#woPackageSave").textContent = "Simpan Perubahan";

  showMessage($("#woPackageMessage"), "Mode edit paket: " + pkg.nama, "success");
  $("#woPackageForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deletePackage(id) {
  const pkg = allPackages.find(item => item.id === id);
  if (!pkg) return;

  if (!confirm(
    `Hapus paket "${pkg.nama}"?\n\nBooking lama tidak ikut dihapus.`
  )) return;

  try {
    requireAdmin();

    await deleteDoc(doc(db, "wo_paket", id));

    allPackages = allPackages.filter(item => item.id !== id);
    renderPackages();

    showMessage($("#woPackageMessage"), "Paket berhasil dihapus.", "success");
  } catch (error) {
    console.error(error);
    showMessage(
      $("#woPackageMessage"),
      "Paket gagal dihapus. Periksa Firestore Rules.",
      "error"
    );
  }
}

$("#woPackageForm").addEventListener("submit", async event => {
  event.preventDefault();

  const button = $("#woPackageSave");

  try {
    requireAdmin();

    const id = $("#woPackageId").value.trim();
    const nama = $("#woPackageName").value.trim();
    const harga = Number($("#woPackagePrice").value);
    const fasilitas = $("#woPackageFacilities").value.trim();
    const deskripsi = $("#woPackageDescription").value.trim();
    const aktif = $("#woPackageActive").checked;

    if (!nama || !fasilitas || !Number.isFinite(harga) || harga < 0) {
      throw new Error("Isi nama, harga yang valid, dan fasilitas paket.");
    }

    button.disabled = true;
    button.textContent = "Menyimpan...";
    showMessage($("#woPackageMessage"), "");

    const packageData = {
      nama,
      harga,
      fasilitas,
      deskripsi,
      aktif,
      updatedAt: serverTimestamp()
    };

    if (id) {
      await updateDoc(doc(db, "wo_paket", id), packageData);
    } else {
      const newRef = doc(collection(db, "wo_paket"));

      await setDoc(newRef, {
        ...packageData,
        createdAt: serverTimestamp()
      });
    }

    resetPackageForm();
    await loadPackages();

    showMessage($("#woPackageMessage"), "Paket berhasil disimpan.", "success");
  } catch (error) {
    console.error(error);
    showMessage(
      $("#woPackageMessage"),
      error.message || "Gagal menyimpan paket. Periksa Firestore Rules.",
      "error"
    );
  } finally {
    button.disabled = false;
    button.textContent = $("#woPackageId").value
      ? "Simpan Perubahan"
      : "Simpan Paket";
  }
});

$("#woPackageReset").addEventListener("click", resetPackageForm);

/* =========================================
   BOOKING WEDDING ORGANIZER
   Koleksi: booking_wo
========================================= */

function renderBookings() {
  const container = $("#woBookingsList");

  if (!allBookings.length) {
    container.innerHTML = '<div class="empty-state">Belum ada booking WO yang masuk.</div>';
    return;
  }

  const sorted = [...allBookings].sort((a, b) =>
    String(a.tanggalResepsi || "9999-12-31").localeCompare(String(b.tanggalResepsi || "9999-12-31"))
  );

  container.innerHTML = renderStatusGroups(sorted, booking =>
    STATUSES.includes(booking.status) ? booking.status : "Menunggu konfirmasi",
    booking => {
      const id = booking.documentId || booking.id || booking.bookingId || "";
      const status = STATUSES.includes(booking.status) ? booking.status : "Menunggu konfirmasi";
      const extras = Array.isArray(booking.layananTambahan)
        ? booking.layananTambahan.join(", ")
        : booking.layananTambahan || "-";
      const whatsappMessage = `Halo ${booking.namaPria || ""} dan ${booking.namaWanita || ""}, kami dari Laksana Jaya Digital terkait booking Wedding Organizer ${id}. Paket: ${booking.paketNama || "-"}.`;
      return `
        <article class="wo-booking-card">
          <div class="wo-booking-summary">
            <div class="wo-booking-title">
              <h4>${escapeHTML(booking.namaPria || "-")} &amp; ${escapeHTML(booking.namaWanita || "-")}</h4>
              <span class="status-pill">${escapeHTML(status)}</span>
            </div>
            <p class="wo-booking-meta">${escapeHTML(booking.paketNama || "Paket WO belum ditentukan")} <span class="compact-separator">•</span> ${escapeHTML(formatRupiah(booking.hargaPaket))}</p>
            <p class="wo-booking-meta">Resepsi: ${escapeHTML(booking.tanggalResepsi || "Belum ditentukan")} <span class="compact-separator">•</span> No. ${escapeHTML(id)}</p>
          </div>
          <div class="wo-booking-controls">
            <select class="wo-booking-status" aria-label="Ubah status booking ${escapeHTML(id)}" data-id="${escapeHTML(id)}">
              ${STATUSES.map(item => `<option value="${escapeHTML(item)}" ${item === status ? "selected" : ""}>${escapeHTML(item)}</option>`).join("")}
            </select>
            <button class="btn btn-primary wo-save-booking" type="button" data-id="${escapeHTML(id)}">Simpan</button>
            <a class="btn btn-outline" target="_blank" rel="noopener noreferrer" href="${escapeHTML(whatsappURL(booking.telepon, whatsappMessage))}">WhatsApp</a>
          </div>
          <details class="wo-booking-details">
            <summary>Lihat rincian booking</summary>
            <div class="wo-booking-detail-grid">
              <p><span>Nomor booking</span><strong>${escapeHTML(id)}</strong></p>
              <p><span>WhatsApp</span><strong>${escapeHTML(booking.telepon || "-")}</strong></p>
              <p><span>Harga paket</span><strong>${escapeHTML(formatRupiah(booking.hargaPaket))}</strong></p>
              <p><span>DP</span><strong>${escapeHTML(formatRupiah(booking.nominalDP ?? booking.jumlahDP ?? booking.dp))}</strong></p>
              <p><span>Sisa pembayaran</span><strong>${escapeHTML(formatRupiah(booking.sisaPembayaran))}</strong></p>
              <p><span>Tanggal akad</span><strong>${escapeHTML(booking.tanggalAkad || "-")}</strong></p>
              <p><span>Tanggal resepsi</span><strong>${escapeHTML(booking.tanggalResepsi || "-")}</strong></p>
              <p><span>Lokasi acara</span><strong>${escapeHTML(booking.lokasi || "-")}</strong></p>
              <p><span>Perkiraan tamu</span><strong>${escapeHTML(booking.jumlahTamu ?? "-")}</strong></p>
              <p><span>Layanan tambahan</span><strong>${escapeHTML(extras)}</strong></p>
              <p class="wo-booking-notes"><span>Catatan</span><strong>${escapeHTML(booking.catatan || "-")}</strong></p>
            </div>
          </details>
        </article>`;
    }
  );

  container.querySelectorAll(".wo-save-booking").forEach(button => {
    button.addEventListener("click", () => saveBookingStatus(button.dataset.id));
  });
}

async function loadBookings() {
  if (loadingBookings) return;

  loadingBookings = true;
  $("#woBookingsList").innerHTML =
    '<div class="empty-state">Memuat booking WO...</div>';

  try {
    requireAdmin();

    const result = await getDocs(collection(db, "booking_wo"));

    allBookings = result.docs.map(snapshot => ({
      id: snapshot.id,
      ...snapshot.data(),
      documentId: snapshot.id
    }));

    renderBookings();

    showMessage(
      $("#woBookingMessage"),
      `${allBookings.length} booking berhasil dimuat.`,
      "success"
    );
  } catch (error) {
    console.error(error);
    $("#woBookingsList").innerHTML =
      '<div class="empty-state">Booking gagal dimuat.</div>';

    showMessage(
      $("#woBookingMessage"),
      "Gagal membaca booking. Periksa Firestore Rules dan koneksi.",
      "error"
    );
  } finally {
    loadingBookings = false;
  }
}

async function saveBookingStatus(id) {
  try {
    requireAdmin();

    const booking = allBookings.find(item => item.documentId === id);
    if (!booking) throw new Error("Booking tidak ditemukan.");

    const select = document.querySelector(
      `.wo-booking-status[data-id="${CSS.escape(id)}"]`
    );

    const status = select?.value;

    if (!STATUSES.includes(status)) {
      throw new Error("Status booking tidak valid.");
    }

    await updateDoc(doc(db, "booking_wo", id), {
      status,
      updatedAt: serverTimestamp()
    });

    // Sinkronkan status publik untuk pelanggan yang melacak booking.
    await setDoc(doc(db, "booking_wo_tracking", id), {
      bookingId: id,
      status,
      updatedAt: serverTimestamp()
    }, { merge: true });

    booking.status = status;
    renderBookings();

    showMessage(
      $("#woBookingMessage"),
      `Status booking ${id} berhasil diperbarui menjadi "${status}".`,
      "success"
    );
  } catch (error) {
    console.error(error);
    showMessage(
      $("#woBookingMessage"),
      error.message || "Gagal memperbarui status booking.",
      "error"
    );
  }
}

$("#woBookingReload").addEventListener("click", loadBookings);
