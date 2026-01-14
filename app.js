let qrList = [];

/* ========= Chuẩn hoá text ========= */
function normalizeText(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/* ========= Map ngân hàng ========= */
const BANK_MAP = {
  "vietcombank": "VCB", "vcb": "VCB",
  "vietinbank": "CTG", "ctg": "CTG",
  "bidv": "BIDV",
  "agribank": "AGRIBANK",
  "techcombank": "TCB", "tcb": "TCB",
  "mbbank": "MB", "mb": "MB", "nganhangquandoi": "MB",
  "acb": "ACB",
  "sacombank": "STB",
  "vpbank": "VPB",
  "tpbank": "TPB",
  "shb": "SHB",
  "hdbank": "HDB",
  "ocb": "OCB",
  "msb": "MSB", "maritimebank": "MSB",
  "eximbank": "EIB",
  "seabank": "SEAB",
  "vib": "VIB",
  "scb": "SCB",
  "abbank": "ABB",
  "namabank": "NAB",
  "baovietbank": "BVB",
  "kienlongbank": "KLB",
  "vietabank": "VAB",
  "bacabank": "BAB",
  "pvcombank": "PVCB",
  "saigonbank": "SGB",
  "vietbank": "VBB",
  "dongabank": "DAB",
  "lienvietpostbank": "LPB", "lpbank": "LPB",
  "oceanbank": "OJB",
  "gpbank": "GPB",
  "cbbank": "CBB"
};

function getBankCode(rawName) {
  if (!rawName) return null;
  const key = normalizeText(rawName);
  return BANK_MAP[key] || null;
}

/* ========= Tải file Excel mẫu ========= */
function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["STK", "Ngân hàng"],
    ["1049984441", "Vietcombank"],
    ["6886241206", "MB Bank"],
    ["4552733316", "BIDV"]
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, "mau_qr.xlsx");
}

/* ========= Xử lý Excel ========= */
function processExcel() {
  const fileInput = document.getElementById("fileInput");
  const des = document.getElementById("desInput").value.trim();

  if (!fileInput.files.length) return alert("❗ Chọn file Excel");
  if (!des) return alert("❗ Nhập nội dung (des)");

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = e => {
    const data = new Uint8Array(e.target.result);
    const wb = XLSX.read(data, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    qrList = [];
    document.getElementById("preview").innerHTML = "";

    let ok = 0, fail = 0;

    rows.forEach(row => {
      // chuẩn hoá key
      const r = {};
      Object.keys(row).forEach(k => r[k.toLowerCase().trim()] = row[k]);

      const acc = String(
        r["stk"] || r["so tk"] || r["sotk"] || r["tai khoan"] || ""
      ).trim();

      const bankRaw = String(
        r["ngân hàng"] || r["ngan hang"] || r["bank"] || ""
      ).trim();

      const bankCode = getBankCode(bankRaw);

      if (!acc || !bankCode) {
        fail++;
        return;
      }

      const url =
        `https://qr.sepay.vn/img?acc=${acc}` +
        `&bank=${bankCode}` +
        `&amount=` +
        `&des=${encodeURIComponent(des)}` +
        `&template=vietqr&download=false`;

      qrList.push({ acc, bankRaw, url });

      // ==== hiển thị đẹp ====
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <div class="bank">${bankRaw}</div>
        <div class="acc">${acc}</div>
        <img src="${url}" />
        <a href="${url}&download=true" target="_blank">⬇ Tải QR</a>
      `;

      document.getElementById("preview").appendChild(card);

      ok++;
    });

    alert(`✅ Thành công: ${ok}\n❌ Bỏ qua: ${fail}`);
  };

  reader.readAsArrayBuffer(file);
}

/* ========= Xuất PDF ========= */
async function exportPDF() {
  if (!qrList.length) return alert("❗ Chưa có QR");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  for (let i = 0; i < qrList.length; i++) {
    if (i > 0) pdf.addPage();

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
// ==== hiển thị card đẹp ====
const card = document.createElement("div");
card.className = "card";

card.innerHTML = `
  <div class="bank">${bankRaw}</div>
  <div class="acc">STK: ${acc}</div>
  <div class="des">Nội dung: ${des}</div>
  <img src="${url}" alt="QR ${acc}" />
  <div class="actions">
    <a href="${url}&download=true" target="_blank">⬇ Tải QR</a>
    <a href="${url}" target="_blank">🔍 Xem lớn</a>
  </div>
`;

document.getElementById("preview").appendChild(card);
