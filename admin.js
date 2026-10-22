import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  getFirestore, collection, getDocs, doc, getDoc, updateDoc, setDoc,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXO6DtfunOtP-45Zpq3yCR-QwoKeBr384",
  authDomain: "laksana-jaya.firebaseapp.com",
  projectId: "laksana-jaya",
  storageBucket: "laksana-jaya.firebasestorage.app",
  messagingSenderId: "663159568736",
  appId: "1:663159568736:web:de6e20a1427380f15c4605"
};

// GANTI dengan email admin yang dibuat di Firebase Authentication.
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
let activeOrderId = null;
let loadingOrders = false;

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function showMessage(element, message, type = "") {
  element.textContent = message;
  element.className = "message" + (type ? " " + type : "");
}

function setLoggedIn(user) {
  $("#loginPanel").hidden = !!user;
  $("#dashboardPanel").hidden = !user;
  if (user) $("#adminIdentity").textContent = "Masuk sebagai " + user.email;
}

$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("#loginButton");
  const email = $("#email").value.trim().toLowerCase();
  const password = $("#password").value;
  showMessage($("#loginMessage"), "");

  if (ADMIN_EMAIL.startsWith("GANTI_")) {
    showMessage($("#loginMessage"), "Isi ADMIN_EMAIL di admin.js dengan email admin Anda.", "error");
    return;
  }

  if (email !== ADMIN_EMAIL.toLowerCase()) {
    showMessage($("#loginMessage"), "Email ini tidak diizinkan untuk dashboard admin.", "error");
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

function readableAuthError(code) {
  const errors = {
    "auth/invalid-credential": "Email atau kata sandi salah.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/user-not-found": "Akun admin belum dibuat di Firebase Authentication.",
    "auth/wrong-password": "Kata sandi salah.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba kembali nanti.",
    "auth/network-request-failed": "Koneksi internet bermasalah."
  };
  return errors[code] || "Login gagal. Periksa akun Firebase Authentication dan konfigurasi proyek.";
}

$("#logoutButton").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    showMessage($("#dashboardMessage"), "Gagal keluar: " + error.message, "error");
  }
});

onAuthStateChanged(auth, async user => {
  if (user && ADMIN_EMAIL !== "GANTI_DENGAN_EMAIL_ADMIN_ANDA"
      && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    setLoggedIn(user);
    await loadOrders();
  } else {
    if (user) await signOut(auth);
    setLoggedIn(null);
  }
});

async function loadOrders() {
  if (loadingOrders) return;
  loadingOrders = true;
  showMessage($("#dashboardMessage"), "Memuat pesanan...");
  $("#ordersList").innerHTML = '<div class="empty-state">Memuat pesanan...</div>';

  try {
    const result = await getDocs(query(collection(db, "pesanan"), orderBy("createdAt", "desc")));
    allOrders = result.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() }));
    renderStats();
    renderOrders();
    showMessage($("#dashboardMessage"), allOrders.length
      ? `${allOrders.length} pesanan berhasil dimuat.`
      : "Belum ada pesanan masuk.", "success");
  } catch (error) {
    console.error(error);
    showMessage($("#dashboardMessage"),
      "Gagal membaca pesanan. Periksa Firestore Rules, koneksi, dan apakah koleksi pesanan sudah benar.",
      "error");
    $("#ordersList").innerHTML = '<div class="empty-state">Pesanan belum dapat dimuat.</div>';
  } finally {
    loadingOrders = false;
  }
}

function renderStats() {
  $("#countAll").textContent = allOrders.length;
  $("#countPending").textContent = allOrders.filter(o => (o.status || "Menunggu konfirmasi") === "Menunggu konfirmasi").length;
  $("#countWorking").textContent = allOrders.filter(o => o.status === "Sedang dikerjakan").length;
  $("#countDone").textContent = allOrders.filter(o => o.status === "Selesai").length;
}

function renderOrders() {
  const term = $("#searchInput").value.trim().toLowerCase();
  const status = $("#statusFilter").value;

  const filtered = allOrders.filter(order => {
    const matchesTerm = [order.id, order.nama, order.layanan, order.telepon]
      .some(value => String(value || "").toLowerCase().includes(term));
    const matchesStatus = !status || (order.status || "Menunggu konfirmasi") === status;
    return matchesTerm && matchesStatus;
  });

  if (!filtered.length) {
    $("#ordersList").innerHTML = '<div class="empty-state">Tidak ada pesanan yang cocok dengan pencarian.</div>';
    return;
  }

  $("#ordersList").innerHTML = filtered.map(order => `
    <article class="order-card">
      <div>
        <h3>${escapeHTML(order.layanan || "Layanan")} · ${escapeHTML(order.nama || "Pelanggan")}</h3>
        <p>Nomor: <strong>${escapeHTML(order.id)}</strong></p>
        <p>WhatsApp: ${escapeHTML(order.telepon || "-")}</p>
        <p>Tanggal dibutuhkan: ${escapeHTML(order.tanggal || "-")}</p>
        <span class="status-pill">${escapeHTML(order.status || "Menunggu konfirmasi")}</span>
      </div>
      <div class="order-actions">
        <button class="btn btn-primary view-order" data-id="${escapeHTML(order.id)}">Detail / Status</button>
        <a class="btn btn-outline contact-order" target="_blank" rel="noopener noreferrer"
          href="https://wa.me/${escapeHTML(String(order.telepon || "").replace(/\D/g, "").replace(/^0/, "62"))}">Hubungi</a>
      </div>
    </article>
  `).join("");

  $("#ordersList").querySelectorAll(".view-order").forEach(button => {
    button.addEventListener("click", () => openOrderDetail(button.dataset.id));
  });
}

function detailLine(label, value) {
  return `<div class="detail-line"><small>${escapeHTML(label)}</small><div>${escapeHTML(value || "-")}</div></div>`;
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

  $("#newStatus").value = STATUSES.includes(order.status) ? order.status : "Menunggu konfirmasi";
  const phone = String(order.telepon || "").replace(/\D/g, "").replace(/^0/, "62");
  $("#customerWhatsApp").href = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent("Halo " + (order.nama || "") + ", kami dari Laksana Jaya Digital terkait pesanan " + order.id + ".")}`
    : `https://wa.me/${ADMIN_WA}`;
  showMessage($("#statusMessage"), "");
  $("#detailDialog").showModal();
}

$("#closeDialog").addEventListener("click", () => $("#detailDialog").close());
$("#detailDialog").addEventListener("click", event => {
  if (event.target === $("#detailDialog")) $("#detailDialog").close();
});

$("#statusForm").addEventListener("submit", async event => {
  event.preventDefault();
  const user = auth.currentUser;
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    showMessage($("#statusMessage"), "Sesi admin tidak valid. Silakan login kembali.", "error");
    return;
  }

  const order = allOrders.find(item => item.id === activeOrderId);
  if (!order) {
    showMessage($("#statusMessage"), "Pesanan tidak ditemukan. Muat ulang daftar pesanan.", "error");
    return;
  }

  const status = $("#newStatus").value;
  if (!STATUSES.includes(status)) {
    showMessage($("#statusMessage"), "Status tidak valid.", "error");
    return;
  }

  const button = $("#saveStatusButton");
  button.disabled = true;
  button.textContent = "Menyimpan...";
  showMessage($("#statusMessage"), "");

  try {
    // Pastikan dokumen pesanan benar-benar ada sebelum mengubahnya.
    const orderRef = doc(db, "pesanan", activeOrderId);
    const orderSnapshot = await getDoc(orderRef);
    if (!orderSnapshot.exists()) throw new Error("Dokumen pesanan tidak ditemukan.");

    await updateDoc(orderRef, {
      status,
      updatedAt: serverTimestamp()
    });

    // Sinkronkan status untuk halaman pelacakan pelanggan.
    await setDoc(doc(db, "pelacakan", activeOrderId), {
      orderId: activeOrderId,
      layanan: order.layanan || "",
      nama: order.nama || "",
      status,
      updatedAt: serverTimestamp()
    }, { merge: true });

    order.status = status;
    renderStats();
    renderOrders();
    openOrderDetail(activeOrderId);
    showMessage($("#statusMessage"), "Status pesanan berhasil diperbarui.", "success");
  } catch (error) {
    console.error(error);
    showMessage($("#statusMessage"),
      "Status gagal disimpan. Periksa Firestore Rules dan pastikan akun ini memiliki hak admin.",
      "error");
  } finally {
    button.disabled = false;
    button.textContent = "Simpan Status";
  }
});

$("#reloadButton").addEventListener("click", loadOrders);
$("#searchInput").addEventListener("input", renderOrders);
$("#statusFilter").addEventListener("change", renderOrders);