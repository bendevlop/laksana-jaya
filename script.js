import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

/* Konfigurasi proyek Firebase Laksana Jaya */
const firebaseConfig = {
  apiKey: "AIzaSyBXO6DtfunOtP-45Zpq3yCR-QwoKeBr384",
  authDomain: "laksana-jaya.firebaseapp.com",
  projectId: "laksana-jaya",
  storageBucket: "laksana-jaya.firebasestorage.app",
  messagingSenderId: "663159568736",
  appId: "1:663159568736:web:de6e20a1427380f15c4605"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const ADMIN_WA = "6283135335733";
const LOCAL_KEY = "LaksanaJayaOrders_v4";

const $ = (selector) => document.querySelector(selector);
const orderForm = $("#orderForm");
const serviceSelect = $("#serviceSelect");
const detailsField = $("#serviceDetails");
const orderMessage = $("#orderMessage");

$("#year").textContent = new Date().getFullYear();

const detailPrompts = {
  "Undangan": "Nama lengkap mempelai pria dan wanita, nama orang tua, tanggal dan waktu acara, alamat akad/resepsi, tema desain, serta teks tambahan.",
  "Rias Makeup": "Jenis acara (akad/wedding/undangan/lainnya), tanggal, jam, lokasi, jumlah orang yang dirias, serta jenis paket yang diinginkan.",
  "Edit Dokumen": "Jenis dokumen, bagian yang perlu diedit, format hasil yang diinginkan, jumlah halaman, serta instruksi khusus.",
  "Jasa Ketik": "Jenis dokumen, materi yang akan diketik, perkiraan jumlah halaman, format hasil, tenggat waktu, serta instruksi khusus."
};

serviceSelect.addEventListener("change", () => {
  const service = serviceSelect.value;
  detailsField.placeholder = detailPrompts[service] || "Isi rincian pesanan Anda di sini.";
});

document.querySelectorAll(".pesan-layanan").forEach(button => {
  button.addEventListener("click", () => {
    serviceSelect.value = button.dataset.service;
    serviceSelect.dispatchEvent(new Event("change"));
    $("#pesan").scrollIntoView({ behavior: "smooth" });
    detailsField.focus({ preventScroll: true });
  });
});

$("#menuToggle").addEventListener("click", () => {
  $("#mainNav").classList.toggle("open");
});
$("#mainNav").querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => $("#mainNav").classList.remove("open"));
});

function readLocalOrders() {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveLocalOrder(order) {
  const orders = readLocalOrders().filter(item => item.id !== order.id);
  orders.unshift(order);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(orders.slice(0, 50)));
  renderHistory();
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function renderHistory() {
  const orders = readLocalOrders();
  $("#totalPesanan").textContent = orders.length;
  const list = $("#historyList");

  if (!orders.length) {
    list.innerHTML = '<div class="empty-state">Belum ada pesanan di browser ini.</div>';
    return;
  }

  list.innerHTML = orders.map(order => `
    <article class="history-item">
      <div>
        <h3>${escapeHTML(order.layanan)}</h3>
        <p>Nomor: <strong>${escapeHTML(order.id)}</strong></p>
        <p>Tanggal: ${escapeHTML(order.createdAt || "-")}</p>
        <p>Status terakhir tersimpan: ${escapeHTML(order.status || "Menunggu konfirmasi")}</p>
      </div>
      <button class="btn btn-outline track-this" data-id="${escapeHTML(order.id)}">Lacak status</button>
    </article>
  `).join("");

  list.querySelectorAll(".track-this").forEach(button => {
    button.addEventListener("click", () => {
      $("#trackingId").value = button.dataset.id;
      $("#lacak").scrollIntoView({ behavior: "smooth" });
      $("#trackingForm").requestSubmit();
    });
  });
}

function createOrderId() {
  const date = new Date();
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `LJ-${ymd}-${random}`;
}

function formatWA(order) {
  return [
    "PESANAN BARU - LAKSANA JAYA DIGITAL",
    "",
    `Nomor pesanan: ${order.id}`,
    `Layanan: ${order.layanan}`,
    `Nama: ${order.nama}`,
    `WhatsApp pelanggan: ${order.telepon}`,
    `Tanggal dibutuhkan: ${order.tanggal || "-"}`,
    `Rincian: ${order.rincian}`,
    `Catatan: ${order.catatan || "-"}`,
    "",
    "Mohon konfirmasi pesanan ini."
  ].join("\n");
}

orderForm.addEventListener("submit", async event => {
  event.preventDefault();
  const submitButton = $("#submitOrder");
  orderMessage.className = "message";
  orderMessage.textContent = "";

  if (!orderForm.reportValidity()) return;

  const formData = new FormData(orderForm);
  const layanan = String(formData.get("layanan") || "").trim();
  const nama = String(formData.get("nama") || "").trim();
  const telepon = String(formData.get("telepon") || "").trim();
  const rincian = String(formData.get("rincian") || "").trim();
  const tanggal = String(formData.get("tanggal") || "");
  const catatan = String(formData.get("catatan") || "").trim();

  if (!layanan || !nama || !telepon || !rincian) {
    orderMessage.className = "message error";
    orderMessage.textContent = "Mohon lengkapi semua kolom wajib.";
    return;
  }

  const order = {
    id: createOrderId(),
    layanan, nama, telepon, tanggal, rincian, catatan,
    status: "Menunggu konfirmasi",
    createdAt: new Date().toLocaleString("id-ID"),
    createdAtISO: new Date().toISOString()
  };

  submitButton.disabled = true;
  submitButton.textContent = "Menyimpan pesanan...";

  try {
    // Simpan data pesanan untuk dashboard admin.
    await setDoc(doc(db, "pesanan", order.id), {
      ...order,
      createdAt: serverTimestamp()
    });

    // Dokumen terpisah untuk pelacakan publik.
    await setDoc(doc(db, "pelacakan", order.id), {
      orderId: order.id,
      layanan: order.layanan,
      nama: order.nama,
      status: order.status,
      updatedAt: serverTimestamp()
    });

    saveLocalOrder(order);
    $("#trackingId").value = order.id;
    orderMessage.className = "message success";
    orderMessage.textContent = `Pesanan tersimpan. Nomor pesanan Anda: ${order.id}`;

    const waURL = "https://wa.me/" + ADMIN_WA + "?text=" + encodeURIComponent(formatWA(order));
    // Membuka tab yang sama agar tidak terhalang pemblokir pop-up.
    window.location.assign(waURL);
  } catch (error) {
    console.error("Gagal menyimpan pesanan:", error);
    orderMessage.className = "message error";
    orderMessage.textContent =
      "Pesanan belum berhasil disimpan ke server. Periksa koneksi, Firebase Firestore, dan Rules. Jangan kirim ulang sebelum memeriksa apakah pesanan sudah tercatat.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Kirim Pesanan";
  }
});

$("#trackingForm").addEventListener("submit", async event => {
  event.preventDefault();
  const id = $("#trackingId").value.trim().toUpperCase();
  const result = $("#trackingResult");
  result.innerHTML = '<p class="muted">Sedang mencari pesanan...</p>';

  if (!id) {
    result.textContent = "Masukkan nomor pesanan.";
    return;
  }

  try {
    const snapshot = await getDoc(doc(db, "pelacakan", id));

    if (!snapshot.exists()) {
      result.innerHTML = '<div class="track-result">Nomor pesanan belum ditemukan. Periksa kembali nomor pesanan Anda.</div>';
      return;
    }

    const data = snapshot.data();
    result.innerHTML = `
      <div class="track-result">
        <p><strong>Nomor pesanan:</strong> ${escapeHTML(data.orderId || id)}</p>
        <p><strong>Layanan:</strong> ${escapeHTML(data.layanan || "-")}</p>
        <p><strong>Nama:</strong> ${escapeHTML(data.nama || "-")}</p>
        <p><strong>Status:</strong> <span class="status-pill">${escapeHTML(data.status || "Menunggu konfirmasi")}</span></p>
      </div>
    `;

    const local = readLocalOrders();
    const found = local.find(order => order.id === id);
    if (found) {
      found.status = data.status || found.status;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
      renderHistory();
    }
  } catch (error) {
    console.error("Gagal melacak pesanan:", error);
    result.innerHTML = '<div class="track-result">Tidak dapat memuat status. Periksa koneksi dan Firestore Rules.</div>';
  }
});

$("#refreshHistory").addEventListener("click", renderHistory);
renderHistory();