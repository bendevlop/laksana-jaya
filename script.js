const SERVICES=[
{name:"Ketik Ulang Dokumen",icon:"▤",desc:"Ketik dari foto, PDF, atau catatan menjadi dokumen rapi.",price:"Mulai Rp2.000/halaman"},
{name:"Edit & Rapikan Word",icon:"✎",desc:"Perbaikan format, margin, paragraf, tabel, dan tata letak.",price:"Mulai Rp5.000"},
{name:"CV & Surat Lamaran",icon:"▣",desc:"CV dan surat lamaran yang bersih serta mudah dibaca.",price:"Mulai Rp10.000"},
{name:"Surat Resmi",icon:"▧",desc:"Bantu menyusun surat sesuai kebutuhan Anda.",price:"Mulai Rp5.000"},
{name:"Edit PDF & Excel",icon:"▦",desc:"Rapikan PDF atau bantu pengolahan tabel sederhana.",price:"Mulai Rp5.000"},
{name:"Desain Undangan",icon:"✉",desc:"Desain undangan digital dan materi dokumen sederhana.",price:"Mulai Rp15.000"}
];
const cfg=window.APP_CONFIG||{};
const configured=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("PASTE_")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("PASTE_");
const supabaseClient=configured&&window.supabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
const waNumber=String(cfg.WHATSAPP_ADMIN||"").replace(/\D/g,"");
const businessName=cfg.BUSINESS_NAME||"Laksana Jaya";
const $=id=>document.getElementById(id);
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function waLink(text){return `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;}
function showMessage(id,msg,isError=false){$(id).textContent=msg;$(id).style.color=isError?"#b53d30":"var(--green)";}
function renderServices(){
  $("serviceGrid").innerHTML=SERVICES.map(s=>`<article class="service-card"><div class="service-icon">${s.icon}</div><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p><div class="service-bottom"><strong>${esc(s.price)}</strong><button type="button" data-service="${esc(s.name)}">Pilih →</button></div></article>`).join("");
  $("serviceSelect").innerHTML='<option value="">Pilih layanan</option>'+SERVICES.map(s=>`<option>${esc(s.name)}</option>`).join("")+'<option>Layanan lainnya</option>';
}
$("serviceGrid").addEventListener("click",e=>{const b=e.target.closest("[data-service]");if(!b)return;$("serviceSelect").value=b.dataset.service;$("pesan").scrollIntoView({behavior:"smooth"});});
$("year").textContent=new Date().getFullYear();
$("contactWhatsApp").addEventListener("click",()=>{if(!waNumber){alert("Nomor WhatsApp belum diatur di config.js");return;}window.open(waLink(`Halo ${businessName}, saya ingin bertanya tentang jasa ketik dan edit dokumen.`),"_blank","noopener");});
$("orderForm").addEventListener("submit",async e=>{
 e.preventDefault();const form=e.currentTarget;const data=new FormData(form);
 if(!configured||!supabaseClient){showMessage("formMessage","Database online belum diatur. Lengkapi config.js dan ikuti PETUNJUK-ONLINE.txt.",true);return;}
 if(waNumber.length<9){showMessage("formMessage","Nomor WhatsApp admin belum benar di config.js.",true);return;}
 const order={customer_name:String(data.get("name")).trim(),customer_phone:String(data.get("phone")).trim(),service:String(data.get("service")),details:String(data.get("details")).trim(),deadline:String(data.get("deadline")),budget:String(data.get("budget")||"").trim(),file_name:String(data.get("fileName")||"").trim(),status:"Menunggu"};
 const submit=form.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent="Menyimpan pesanan...";
 try{
  const {data:created,error}=await supabaseClient.from("orders").insert(order).select("id,created_at").single();
  if(error)throw error;
  const message=`Halo ${businessName}, saya ingin memesan jasa dokumen.\n\nNomor pesanan: ${created.id}\nNama: ${order.customer_name}\nNomor WhatsApp: ${order.customer_phone}\nLayanan: ${order.service}\nDetail: ${order.details}\nTarget selesai: ${order.deadline}\nAnggaran: ${order.budget||"Mohon info harga"}\nNama file: ${order.file_name||"Belum dilampirkan"}\n\nMohon konfirmasi harga dan waktu pengerjaannya. Terima kasih.`;
  showMessage("formMessage",`Pesanan #${created.id} berhasil disimpan online. WhatsApp akan dibuka.`);
  window.open(waLink(message),"_blank","noopener");form.reset();
 }catch(err){console.error(err);showMessage("formMessage","Gagal menyimpan pesanan. Periksa pengaturan Supabase dan kebijakan RLS.",true);}
 finally{submit.disabled=false;submit.textContent="Kirim Pesanan ke WhatsApp ↗";}
});
const modal=$("adminModal");
function openAdmin(){modal.hidden=false;document.body.style.overflow="hidden";$("adminLoginView").hidden=false;$("adminDashboard").hidden=true;showMessage("loginMessage","");}
function closeAdmin(){modal.hidden=true;document.body.style.overflow="";}
$("adminOpen").addEventListener("click",openAdmin);$("adminOpenFooter").addEventListener("click",openAdmin);$("closeAdmin").addEventListener("click",closeAdmin);
modal.addEventListener("click",e=>{if(e.target===modal)closeAdmin();});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)closeAdmin();});
async function getSession(){if(!supabaseClient)return null;const {data}=await supabaseClient.auth.getSession();return data.session;}
$("adminLoginForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!supabaseClient){showMessage("loginMessage","Lengkapi konfigurasi Supabase terlebih dahulu.",true);return;}
 const data=new FormData(e.currentTarget);const {error}=await supabaseClient.auth.signInWithPassword({email:data.get("email"),password:data.get("password")});
 if(error){showMessage("loginMessage","Login gagal. Periksa email/kata sandi dan pastikan akun admin sudah dibuat.",true);return;}
 await showDashboard();
});
async function showDashboard(){
 const session=await getSession();if(!session)return;
 $("adminLoginView").hidden=true;$("adminDashboard").hidden=false;$("adminEmail").textContent=session.user.email||"Admin";await loadOrders();
}
$("adminLogout").addEventListener("click",async()=>{if(supabaseClient)await supabaseClient.auth.signOut();openAdmin();});
$("refreshOrders").addEventListener("click",loadOrders);
async function loadOrders(){
 if(!supabaseClient)return;
 showMessage("adminMessage","Memuat pesanan...");
 const {data,error}=await supabaseClient.from("orders").select("*").order("created_at",{ascending:false}).limit(300);
 if(error){showMessage("adminMessage","Tidak bisa memuat data. Pastikan akun admin telah ditandai admin di tabel profiles dan SQL RLS sudah diterapkan.",true);return;}
 $("totalOrders").textContent=data.length;$("processingOrders").textContent=data.filter(o=>o.status==="Diproses").length;$("doneOrders").textContent=data.filter(o=>o.status==="Selesai").length;
 const tbody=$("ordersTableBody");
 if(!data.length){tbody.innerHTML='<tr><td colspan="4" class="empty-row">Belum ada pesanan.</td></tr>';showMessage("adminMessage","Data sudah diperbarui.");return;}
 tbody.innerHTML=data.map(o=>`<tr><td><strong>#${o.id}</strong><br>${esc(o.customer_name)}<br><small>${esc(new Date(o.created_at).toLocaleString("id-ID"))}</small></td><td><div class="detail-text"><strong>${esc(o.service)}</strong><br>${esc(o.customer_phone)}<br>${esc(o.details)}<br><small>Target: ${esc(o.deadline)} · Anggaran: ${esc(o.budget||"-")} · File: ${esc(o.file_name||"-")}</small></div></td><td><select class="status-select" data-status="${o.id}">${["Menunggu","Diproses","Selesai","Dibatalkan"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select></td><td><button class="button secondary small" data-chat="${o.id}">WhatsApp</button></td></tr>`).join("");
 showMessage("adminMessage","Pesanan berhasil dimuat.");
}
$("ordersTableBody").addEventListener("change",async e=>{
 const sel=e.target.closest("[data-status]");if(!sel)return;
 const {error}=await supabaseClient.from("orders").update({status:sel.value}).eq("id",Number(sel.dataset.status));
 if(error){alert("Status gagal diperbarui. Pastikan Anda login sebagai admin.");await loadOrders();}else await loadOrders();
});
$("ordersTableBody").addEventListener("click",e=>{
 const b=e.target.closest("[data-chat]");if(!b)return;
 const row=b.closest("tr"),cells=row.querySelectorAll("td");
 const message=`Halo ${businessName}, terkait pesanan #${b.dataset.chat}.\n${cells[0].innerText}\n${cells[1].innerText}`;
 window.open(waLink(message),"_blank","noopener");
});
$("menuToggle").addEventListener("click",()=>$("mainNav").classList.toggle("open"));
document.querySelectorAll("#mainNav a").forEach(a=>a.addEventListener("click",()=>$("mainNav").classList.remove("open")));
renderServices();
if(!configured){console.warn("Supabase belum dikonfigurasi. Isi config.js sebelum dipasang online.");}
