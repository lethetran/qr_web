let qrList = [];
let errorList = [];

/* ===== Chuẩn hoá text ===== */
function normalizeText(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/* ===== Map ngân hàng ===== */
const BANK_MAP = {
  "vietcombank":"VCB","vcb":"VCB",
  "vietinbank":"CTG","ctg":"CTG",
  "bidv":"BIDV",
  "agribank":"AGRIBANK",
  "techcombank":"TCB","tcb":"TCB",
  "mbbank":"MB","mb":"MB","nganhangquandoi":"MB",
  "acb":"ACB",
  "sacombank":"STB",
  "vpbank":"VPB",
  "tpbank":"TPB",
  "shb":"SHB",
  "hdbank":"HDB",
  "ocb":"OCB",
  "msb":"MSB","maritimebank":"MSB",
  "eximbank":"EIB",
  "seabank":"SEAB",
  "vib":"VIB",
  "scb":"SCB",
  "abbank":"ABB",
  "namabank":"NAB",
  "baovietbank":"BVB",
  "kienlongbank":"KLB",
  "vietabank":"VAB",
  "bacabank":"BAB",
  "pvcombank":"PVCB",
  "saigonbank":"SGB",
  "vietbank":"VBB",
  "dongabank":"DAB",
  "lienvietpostbank":"LPB","lpbank":"LPB",
  "oceanbank":"OJB",
  "gpbank":"GPB",
  "cbbank":"CBB"
};

function getBankCode(rawName) {
  if (!rawName) return null;
  const key = normalizeText(rawName);
  return BANK_MAP[key] || null;
}

/* ===== Tải file Excel mẫu ===== */
function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["STK","Ngân hàng"],
    ["1049984441","Vietcombank"],
    ["6886241206","MB Bank"],
    ["4552733316","BIDV"]
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, "mau_qr.xlsx");
}

/* ===== Xử lý Excel ===== */
function processExcel() {
  const fileInput = document.getElementById("fileInput");
  const des = document.getElementById("desInput").value.trim();
  if (!fileInput.files.length) return alert("Chọn file Excel");
  if (!des) return alert("Nhập nội dung chuyển khoản");

  qrList = [];
  errorList = [];
  document.getElementById("preview").innerHTML = "";

  const reader = new FileReader();
  reader.onload = e => {
    const data = new Uint8Array(e.target.result);
    const wb = XLSX.read(data, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    rows.forEach((row, idx) => {
      const r = {};
      Object.keys(row).forEach(k => r[k.toLowerCase().trim()] = row[k]);

      const acc = String(
        r["stk"] || r["so tk"] || r["sotk"] || r["tai khoan"] || ""
      ).trim();

      const bankRaw = String(
        r["ngân hàng"] || r["ngan hang"] || r["bank"] || ""
      ).trim();

      const bankCode = getBankCode(bankRaw);

      if (!acc) {
        errorList.push({ row: idx+2, stk:"", bank:bankRaw, reason:"Thiếu số tài khoản" });
        return;
      }
      if (!bankCode) {
        errorList.push({ row: idx+2, stk:acc, bank:bankRaw, reason:"Không nhận diện được ngân hàng" });
        return;
      }

      const url =
        `https://qr.sepay.vn/img?acc=${acc}`+
        `&bank=${bankCode}&amount=&des=${encodeURIComponent(des)}`+
        `&template=vietqr&download=false`;

      qrList.push({ acc, bankRaw, bankCode, url });
    });

    rerender();
    buildBankFilter();
    alert(`✅ Thành công: ${qrList.length}\n❌ Lỗi: ${errorList.length}`);
  };

  reader.readAsArrayBuffer(fileInput.files[0]);
}

/* ===== Render lại toàn bộ ===== */
function rerender() {
  const preview = document.getElementById("preview");
  preview.innerHTML = "";
  qrList.forEach((item, idx) => renderCard(item, idx));
  applyFilter();
}

/* ===== Render card ===== */
function renderCard(item, index) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.acc = item.acc;
  card.dataset.bank = item.bankCode;

  const des = document.getElementById("desInput").value.trim();

  card.innerHTML = `
    <div class="bank">${item.bankRaw}</div>
    <div class="acc">STK: ${item.acc}</div>
    <div class="des">Nội dung: ${des}</div>
    <img src="${item.url}" />
    <div class="actions">
      <button class="mini" onclick="editItem(${index})">✏️ Sửa</button>
      <button class="mini danger" onclick="deleteItem(${index})">🗑 Xoá</button>
      <a href="${item.url}&download=true" target="_blank">⬇ QR</a>
    </div>
  `;
  document.getElementById("preview").appendChild(card);
}

/* ===== Sửa ===== */
function editItem(index) {
  const item = qrList[index];

  const newAcc = prompt("Sửa STK:", item.acc);
  if (!newAcc) return;

  const newBank = prompt("Sửa Ngân hàng:", item.bankRaw);
  if (!newBank) return;

  const bankCode = getBankCode(newBank);
  if (!bankCode) return alert("Không nhận diện được ngân hàng");

  item.acc = newAcc.trim();
  item.bankRaw = newBank.trim();
  item.bankCode = bankCode;

  const des = document.getElementById("desInput").value.trim();
  item.url =
    `https://qr.sepay.vn/img?acc=${item.acc}`+
    `&bank=${item.bankCode}&amount=&des=${encodeURIComponent(des)}`+
    `&template=vietqr&download=false`;

  rerender();
}

/* ===== Xoá ===== */
function deleteItem(index) {
  if (!confirm("Bạn chắc chắn muốn xoá?")) return;
  qrList.splice(index,1);
  rerender();
}

/* ===== Filter ===== */
function applyFilter() {
  const keyword = document.getElementById("searchInput").value.trim();
  const bank = document.getElementById("bankFilter").value;

  document.querySelectorAll(".card").forEach(card => {
    const acc = card.dataset.acc;
    const b = card.dataset.bank;

    let show = true;
    if (keyword && !acc.includes(keyword)) show = false;
    if (bank && b !== bank) show = false;

    card.style.display = show ? "flex" : "none";
  });
}

/* ===== Build filter ngân hàng ===== */
function buildBankFilter() {
  const select = document.getElementById("bankFilter");
  select.innerHTML = `<option value="">🏷 Tất cả ngân hàng</option>`;

  const set = new Set(qrList.map(i => i.bankCode));
  set.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    select.appendChild(opt);
  });
}

/* ===== Xuất Excel kết quả ===== */
function exportResultExcel() {
  if (!qrList.length && !errorList.length) return alert("Chưa có dữ liệu");

  const wb = XLSX.utils.book_new();

  const okData = qrList.map((i, idx) => ({
    "STT": idx+1,
    "STK": i.acc,
    "Ngân hàng": i.bankRaw,
    "Mã NH": i.bankCode,
    "Link QR": i.url
  }));
  const wsOk = XLSX.utils.json_to_sheet(okData);
  XLSX.utils.book_append_sheet(wb, wsOk, "Thanh_cong");

  const errData = errorList.map((e, idx) => ({
    "STT": idx+1,
    "Dòng Excel": e.row,
    "STK": e.stk,
    "Ngân hàng": e.bank,
    "Lỗi": e.reason
  }));
  const wsErr = XLSX.utils.json_to_sheet(errData);
  XLSX.utils.book_append_sheet(wb, wsErr, "Loi");

  XLSX.writeFile(wb, "ket_qua_qr.xlsx");
}

/* ===== Xuất PDF ===== */
async function exportPDF() {
  if (!qrList.length) return alert("Chưa có QR");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  for (let i=0;i<qrList.length;i++) {
    if (i>0) pdf.addPage();
    const it = qrList[i];
    pdf.text(`${it.bankRaw} - ${it.acc}`, 10, 10);
    const img = await loadImage(it.url);
    pdf.addImage(img, "PNG", 20, 20, 160, 160);
  }
  pdf.save("qr_output.pdf");
}

function loadImage(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.src = url;
  });
}
