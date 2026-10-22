
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

/* Firebase Laksana Jaya */
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

const $ = selector => document.querySelector(selector);
const orderForm = $("#orderForm");
const serviceSelect = $("#serviceSelect");
const fieldsContainer = $("#serviceSpecificFields");
const orderMessage = $("#orderMessage");

$("#year").textContent = new Date().getFullYear();

/* Pilihan formulir setiap katalog */
const serviceFields = {
  "Undangan": [
    { section: "DATA MEMPELAI PRIA" },
    { name: "gelarPria", label: "Gelar mempelai pria (opsional)", placeholder: "Contoh: S.Pd." },
    { name: "namaPria", label: "Nama lengkap mempelai pria", required: true },
    { name: "ayahPria", label: "Nama ayah mempelai pria", required: true },
    { name: "ibuPria", label: "Nama ibu mempelai pria", required: true },
    { name: "anakPria", label: "Anak ke-berapa mempelai pria", required: true, placeholder: "Contoh: Anak ke-2 dari 3 bersaudara" },
    { name: "alamatPria", label: "Alamat mempelai pria", required: true, full: true, type: "textarea" },

    { section: "DATA MEMPELAI WANITA" },
    { name: "gelarWanita", label: "Gelar mempelai wanita (opsional)", placeholder: "Contoh: S.Pd." },
    { name: "namaWanita", label: "Nama lengkap mempelai wanita", required: true },
    { name: "ayahWanita", label: "Nama ayah mempelai wanita", required: true },
    { name: "ibuWanita", label: "Nama ibu mempelai wanita", required: true },
    { name: "anakWanita", label: "Anak ke-berapa mempelai wanita", required: true, placeholder: "Contoh: Anak ke-1 dari 2 bersaudara" },
    { name: "alamatWanita", label: "Alamat mempelai wanita", required: true, full: true, type: "textarea" },

    { section: "AKAD NIKAH" },
    { name: "tanggalAkad", label: "Tanggal akad", type: "date", required: true },
    { name: "jamAkad", label: "Jam akad", type: "time", required: true },
    { name: "lokasiAkad", label: "Tempat akad", required: true },
    { name: "alamatAkad", label: "Alamat lengkap akad", type: "textarea", full: true, required: true },

    { section: "RESEPSI PERNIKAHAN" },
    { name: "tanggalResepsi", label: "Tanggal resepsi", type: "date", required: true },
    { name: "jamResepsi", label: "Jam resepsi", type: "text", placeholder: "Contoh: 11.00–selesai", required: true },
    { name: "lokasiResepsi", label: "Tempat resepsi", required: true },
    { name: "alamatResepsi", label: "Alamat lengkap resepsi", type: "textarea", full: true, required: true },

    { section: "DETAIL CETAK DAN DESAIN" },
    { name: "modelUndangan", label: "Model undangan", type: "select", required: true,
      options: ["Pilih model", "Undangan cetak lipat", "Undangan satu lembar", "Undangan digital", "Undangan custom"] },
    { name: "jumlahUndangan", label: "Jumlah undangan", type: "number", placeholder: "Contoh: 200" },
    { name: "warnaUndangan", label: "Warna atau tema desain", placeholder: "Contoh: Burgundy dan gold" },
    { name: "turutMengundang", label: "Keluarga yang turut mengundang", type: "textarea", full: true },
    { name: "teksTambahan", label: "Doa atau teks tambahan", type: "textarea", full: true }
  ],

  "Rias Makeup": [
    { name: "jenisMakeup", label: "Jenis layanan makeup", type: "select", required: true,
      options: ["Pilih layanan", "Makeup akad", "Makeup wedding", "Makeup undangan", "Makeup wisuda", "Makeup pesta", "Lainnya"] },
    { name: "tanggal", label: "Tanggal acara", type: "date", required: true },
    { name: "jamAcara", label: "Jam mulai makeup", type: "time", required: true },
    { name: "lokasiMakeup", label: "Alamat lokasi makeup/acara", type: "textarea", full: true, required: true },
    { name: "jumlahOrang", label: "Jumlah orang yang dirias", type: "number", required: true },
    { name: "paketMakeup", label: "Paket makeup yang diinginkan", placeholder: "Tanyakan paket dan harga kepada admin" },
    { name: "permintaanMakeup", label: "Permintaan khusus", type: "textarea", full: true }
  ],

  "Edit Dokumen": [
    { name: "jenisDokumen", label: "Jenis dokumen", type: "select", required: true,
      options: ["Pilih dokumen", "Surat", "CV/Daftar Riwayat Hidup", "Proposal", "Makalah", "Skripsi", "Tabel/Excel", "Dokumen lainnya"] },
    { name: "jumlahHalaman", label: "Jumlah halaman", type: "number", required: true },
    { name: "bagianEdit", label: "Bagian yang ingin diedit", type: "textarea", full: true, required: true },
    { name: "formatHasil", label: "Format hasil", type: "select", required: true,
      options: ["Pilih format", "Word (DOCX)", "PDF", "Excel (XLSX)", "PowerPoint (PPTX)", "Lainnya"] },
    { name: "tenggat", label: "Target selesai", type: "date" },
    { name: "bahanDokumen", label: "Informasi file atau bahan dokumen", type: "textarea", full: true,
      placeholder: "Jelaskan bahan yang tersedia. Pengiriman file dapat dibicarakan dengan admin." }
  ],

  "Jasa Ketik": [
    { name: "jenisKetik", label: "Jenis dokumen yang diketik", type: "select", required: true,
      options: ["Pilih dokumen", "Surat", "Tugas sekolah/kuliah", "Makalah", "Proposal", "Skripsi", "Data tabel", "Dokumen lainnya"] },
    { name: "jumlahHalaman", label: "Perkiraan jumlah halaman", type: "number", required: true },
    { name: "sumberBahan", label: "Sumber bahan ketikan", type: "select", required: true,
      options: ["Pilih sumber", "Foto tulisan", "Tulisan tangan", "PDF", "Word", "Teks chat", "Bahan lainnya"] },
    { name: "formatHasil", label: "Format hasil", type: "select", required: true,
      options: ["Pilih format", "Word (DOCX)", "PDF", "Excel (XLSX)", "Sesuai permintaan"] },
    { name: "tenggat", label: "Target selesai", type: "date" },
    { name: "rincianKetik", label: "Petunjuk atau rincian ketikan", type: "textarea", full: true, required: true }
  ],
  
  "Wedding Organizer": [
    { section: "DATA MEMPELAI" },
    { name: "namaPria", label: "Nama Lengkap Mempelai Pria", required: true },
    { name: "namaWanita", label: "Nama Lengkap Mempelai Wanita", required: true },
    { name: "telepon", label: "Nomor WhatsApp Aktif", required: true, placeholder: "Contoh: 08123456789" },
    
    { section: "RENCANA ACARA" },
    { name: "paketNama", label: "Pilihan Paket WO", type: "select", required: true,
      options: ["Pilih Paket", "Paket Silver", "Paket Gold", "Paket Platinum", "Custom Paket"] },
    { name: "hargaPaket", label: "Perkiraan Anggaran / Harga Paket (Rp)", type: "number", required: true },
    { name: "tanggalAkad", label: "Tanggal Akad Nikah", type: "date", required: true },
    { name: "tanggalResepsi", label: "Tanggal Resepsi Pernikahan", type: "date", required: true },
    { name: "lokasi", label: "Lokasi / Tempat Acara", type: "textarea", full: true, required: true, placeholder: "Contoh: Gedung A / Rumah Mempelai Wanita" },
    { name: "jumlahTamu", label: "Perkiraan Jumlah Tamu (Undangan)", type: "number", placeholder: "Contoh: 500" },
    
    { section: "LAYANAN TAMBAHAN & CATATAN" },
    { name: "layananTambahan", label: "Layanan Tambahan yang Diinginkan", type: "textarea", full: true, placeholder: "Contoh: Katering tambahan, Live Music, Dokumentasi udara (Drone)" },
    { name: "catatan", label: "Catatan atau Permintaan Khusus", type: "textarea", full: true }
  ]

};

/* Membuat kolom formulir secara otomatis */
function renderServiceFields() {
  const service = serviceSelect.value;
  const fields = serviceFields[service];

  if (!fields) {
    fieldsContainer.innerHTML =
      '<div class="empty-state">Silakan pilih layanan untuk menampilkan formulir khusus.</div>';
    return;
  }

  fieldsContainer.innerHTML = '<div class="form-grid">' +
    fields.map(field => {
      if (field.section) {
        return `<h3 class="full form-section-title">${escapeHTML(field.section)}</h3>`;
      }

      const required = field.required ? "required" : "";
      const full = field.full ? "full" : "";
      const placeholder = field.placeholder
        ? `placeholder="${escapeHTML(field.placeholder)}"` : "";
      let control = "";

      if (field.type === "textarea") {
        control = `<textarea name="${field.name}" rows="3" ${required} ${placeholder}></textarea>`;
      } else if (field.type === "select") {
        control = `<select name="${field.name}" ${required}>${
          field.options.map((option, index) =>
            `<option value="${index === 0 ? "" : escapeHTML(option)}" ${index === 0 ? "disabled selected" : ""}>${escapeHTML(option)}</option>`
          ).join("")
        }</select>`;
      } else {
        control = `<input name="${field.name}" type="${field.type || "text"}" ${required} ${placeholder}>`;
      }

      return `<label class="${full}">${escapeHTML(field.label)}${field.required ? " *" : ""}
        ${control}
      </label>`;
    }).join("") + "</div>";

  fieldsContainer.querySelectorAll('input[type="date"]').forEach(input => {
    input.min = new Date().toISOString().slice(0, 10);
  });
}

serviceSelect.addEventListener("change", renderServiceFields);

document.querySelectorAll(".pesan-layanan").forEach(button => {
  button.addEventListener("click", () => {
    serviceSelect.value = button.dataset.service;
    renderServiceFields();
    $("#pesan").scrollIntoView({ behavior: "smooth" });
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
function updateFileWhatsAppNotice() {
  const notice = document.querySelector("#fileWhatsAppNotice");
  const service = document.querySelector("#serviceSelect")?.value;

  if (!notice) return;

  notice.hidden = !["Edit Dokumen", "Jasa Ketik"].includes(service);
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
  const message = [
    "PESANAN BARU - LAKSANA JAYA DIGITAL",
    "",
    `Nomor pesanan: ${order.id}`,
    `Layanan: ${order.layanan}`,
    `Nama pemesan: ${order.nama}`,
    `WhatsApp pelanggan: ${order.telepon}`,
    `Email: ${order.email || "-"}`,
    "",
    "RINCIAN PESANAN",
    order.rincian || "-",
    "",
    `Catatan tambahan: ${order.catatan || "-"}`,
    "",
    "Mohon konfirmasi pesanan ini."
  ];

  if (["Edit Dokumen", "Jasa Ketik"].includes(order.layanan)) {
    message.push(
      "",
      "BERKAS DOKUMEN",
      "Saya akan melampirkan file yang ingin diedit atau diketik langsung di chat WhatsApp ini."
    );
  }

  return message.join("\n");
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
  const email = String(formData.get("email") || "").trim();
  const catatan = String(formData.get("catatan") || "").trim();

  if (!serviceFields[layanan]) {
    orderMessage.className = "message error";
    orderMessage.textContent = "Silakan pilih jenis layanan.";
    return;
  }

  /* Ambil kolom layanan, bukan data kontak umum */
  const commonNames = new Set(["layanan", "nama", "telepon", "email", "catatan"]);
  const detailData = {};

  for (const field of serviceFields[layanan]) {
    if (!field.name) continue;
    const value = String(formData.get(field.name) || "").trim();
    if (value) detailData[field.name] = value;
  }

  const rincian = serviceFields[layanan]
    .filter(field => field.name)
    .map(field => {
      const value = detailData[field.name];
      return value ? `${field.label}: ${value}` : null;
    })
    .filter(Boolean)
    .join("\n");

  if (!rincian) {
    orderMessage.className = "message error";
    orderMessage.textContent = "Mohon isi rincian layanan.";
    return;
  }

  /* Ambil tanggal yang relevan untuk ringkasan pesanan */
  const tanggal = detailData.tanggal ||
    detailData.tanggalAkad ||
    detailData.tanggalResepsi ||
    detailData.tenggat || "";

  const order = {
    id: createOrderId(),
    layanan,
    nama,
    telepon,
    email,
    tanggal,
    rincian,
    detailData,
    catatan,
    status: "Menunggu konfirmasi",
    createdAt: new Date().toLocaleString("id-ID"),
    createdAtISO: new Date().toISOString()
  };

   submitButton.disabled = true;
  submitButton.textContent = "Menyimpan pesanan...";

  try {
    // Jalur penyimpanan bercabang (KODE BARU)
    if (layanan === "Wedding Organizer") {
      // Masuk ke koleksi khusus booking_wo sesuai kebutuhan File 2 Admin
      await setDoc(doc(db, "booking_wo", order.id), {
        ...order.detailData, // memuat namaPria, namaWanita, dll.
        id: order.id,
        bookingId: order.id,
        status: order.status,
        telepon: order.telepon,
        createdAt: serverTimestamp()
      });

      // Simpan juga ke tracking khusus WO
      await setDoc(doc(db, "booking_wo_tracking", order.id), {
        bookingId: order.id,
        status: order.status,
        updatedAt: serverTimestamp()
      });
    } else {
      // Jalur pesanan umum (Undangan, Makeup, Edit, Ketik) yang sudah ada sebelumnya
      await setDoc(doc(db, "pesanan", order.id), {
        ...order,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, "pelacakan", order.id), {
        orderId: order.id,
        layanan: order.layanan,
        status: order.status,
        updatedAt: serverTimestamp()
      });
    }

    saveLocalOrder(order); // Baris kelanjutan bawaan script Anda


    /* Data pelacakan publik tidak menyimpan nama/nomor pelanggan */
    await setDoc(doc(db, "pelacakan", order.id), {
      orderId: order.id,
      layanan: order.layanan,
      status: order.status,
      updatedAt: serverTimestamp()
    });

    saveLocalOrder(order);
    $("#trackingId").value = order.id;
    orderMessage.className = "message success";
    orderMessage.textContent =
      `Pesanan tersimpan. Nomor pesanan Anda: ${order.id}`;

    const waURL = "https://wa.me/" + ADMIN_WA +
      "?text=" + encodeURIComponent(formatWA(order));

    window.location.assign(waURL);
  } catch (error) {
    console.error("Gagal menyimpan pesanan:", error);
    orderMessage.className = "message error";
    orderMessage.textContent =
      "Pesanan belum berhasil disimpan. Periksa koneksi, Firestore Rules, dan konsol browser. Periksa Firebase sebelum mencoba mengirim ulang.";
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
      result.innerHTML =
        '<div class="track-result">Nomor pesanan belum ditemukan. Periksa kembali nomor pesanan Anda.</div>';
      return;
    }

    const data = snapshot.data();
    result.innerHTML = `
      <div class="track-result">
        <p><strong>Nomor pesanan:</strong> ${escapeHTML(data.orderId || id)}</p>
        <p><strong>Layanan:</strong> ${escapeHTML(data.layanan || "-")}</p>
        <p><strong>Status:</strong>
          <span class="status-pill">${escapeHTML(data.status || "Menunggu konfirmasi")}</span>
        </p>
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
    result.innerHTML =
      '<div class="track-result">Tidak dapat memuat status. Periksa koneksi dan Firestore Rules.</div>';
  }
});

$("#refreshHistory").addEventListener("click", renderHistory);

renderServiceFields();
renderHistory();
updateFileWhatsAppNotice();
