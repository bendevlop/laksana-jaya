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
    
    { section: "RENCANA ACARA" },
    { name: "paketNama", label: "Pilihan Paket WO", type: "select", required: true, options: [] }, 
    { name: "hargaPaket", label: "Perkiraan Anggaran / Harga Paket (Rp)", type: "number", required: true },
    { name: "tanggalAkad", label: "Tanggal Akad Nikah", type: "date", required: true },
    { name: "tanggalResepsi", label: "Tanggal Resepsi Pernikahan", type: "date", required: true },
    { name: "lokasi", label: "Lokasi / Tempat Acara", type: "textarea", full: true, required: true },
    { name: "jumlahTamu", label: "Perkiraan Jumlah Tamu (Undangan)", type: "number" },
    
    { section: "LAYANAN TAMBAHAN & CATATAN" },
    { name: "layananTambahan", label: "Layanan Tambahan yang Diinginkan", type: "textarea", full: true },
  ]
};

/* Memuat paket WO dari database admin */
async function fetchActiveWoPackages() {
  try {
    const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js");
    
    const q = query(collection(db, "wo_paket"), where("aktif", "==", true));
    const querySnapshot = await getDocs(q);
    
    const activePackages = ["Pilih Paket"];
    const packagePrices = {}; 

    querySnapshot.forEach((doc) => {
      const pkg = doc.data();
      activePackages.push(pkg.nama);
      packagePrices[pkg.nama] = pkg.harga; 
    });

    activePackages.push("Custom Paket");

    if (serviceFields["Wedding Organizer"]) {
      const paketField = serviceFields["Wedding Organizer"].find(f => f.name === "paketNama");
      if (paketField) {
        paketField.options = activePackages;
      }
    }

    document.addEventListener("change", (e) => {
      if (e.target && e.target.name === "paketNama") {
        const selectedPackage = e.target.value;
        const priceInput = document.querySelector('input[name="hargaPaket"]');
        if (priceInput) {
          if (packagePrices[selectedPackage]) {
            priceInput.value = packagePrices[selectedPackage];
            priceInput.readOnly = true; 
          } else {
            priceInput.value = "";
            priceInput.readOnly = false; 
          }
        }
      }
    });

  } catch (error) {
    console.error("Gagal sinkronisasi paket WO:", error);
  }
}

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
