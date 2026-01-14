let qrList = [];

/* ====== Chuẩn hoá text ====== */
function normalizeText(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "")        // bỏ khoảng trắng
    .replace(/[^a-z0-9]/g, ""); // bỏ ký tự đặc biệt
}

/* ====== Map ngân hàng đầy đủ ====== */
const BANK_MAP = {
  // Vietcombank
  "vietcombank": "VCB",
  "vcb": "VCB",

  // VietinBank
  "vietinbank": "CTG",
  "ctg": "CTG",

  // BIDV
  "bidv": "BIDV",

  // Agribank
  "agribank": "AGRIBANK",

  // Techcombank
  "techcombank": "TCB",
  "tcb": "TCB",

  // MB Bank
  "mbbank": "MB",
  "mb": "MB",
  "nganhangquandoi": "MB",

  // ACB
  "acb": "ACB",

  // Sacombank
  "sacombank": "STB",
  "stb": "STB",

  // VPBank
  "vpbank": "VPB",

  // TPBank
  "tpbank": "TPB",

  // SHB
  "shb": "SHB",

  // HDBank
  "hdbank": "HDB",

  // OCB
  "ocb": "OCB",

  // MSB
  "msb": "MSB",
  "maritimebank": "MSB",

  // Eximbank
  "eximbank": "EIB",

  // SeABank
  "seabank": "SEAB",

  // VIB
  "vib": "VIB",

  // SCB
  "scb": "SCB",

  // ABBank
  "abbank": "ABB",

  // Nam A Bank
  "namabank": "NAB",

  // BaoViet Bank
  "baovietbank": "BVB",

  // KienlongBank
  "kienlongbank": "KLB",

  // Viet A Bank
  "vietabank": "VAB",

  // Bac A Bank
  "bacabank": "BAB",

  // PVcomBank
  "pvcombank": "PVCB",

  // SaigonBank
  "saigonbank": "SGB",

  // VietBank
  "vietbank": "VBB",

  // DongA Bank
  "dongabank": "DAB",

  // LienVietPostBank / LPBank
  "lienvietpostbank": "LPB",
  "lpbank": "LPB",

  // OceanBank
  "oceanbank": "OJB",

  // GPBank
  "gpbank": "GPB",

  // CBBank
  "cbbank": "CBB"
};

function getBankCode(rawName) {
  if (!rawName) return null;
  const key = normalizeText(rawName);
  return BANK_MAP[key] || null;
}

/* ====== Xử lý Excel ====== */
function processExcel() {
  const fileInput = document.getElementById("fileInput");
  const des = document.getElementById("desInput").value.trim();

  if (!fileInput.files.length) {
    alert("❗ Chọn file Excel trước");
    return;
  }
  if (!des) {
    alert("❗ Nhập nội dung chuyển khoản (des)");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = e => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    qrList = [];
    document.getElementById("preview").innerHTML = "";

    let ok = 0, fail = 0;

    rows.forEach((row, idx) => {
      const acc = String(row["STK"] || "").trim();
      const bankRaw = String(row["Ngân hàng"] || "").trim();
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

      const img = document.createElement("img");
      img.src = url;
      img.title = `${bankRaw} - ${acc}`;
      document.getElementById("preview").appendChild(img);

      ok++;
    });

    alert(`✅ Tạo QR thành công: ${ok}\n❌ Bỏ qua: ${fail}`);
  };

  reader.readAsArrayBuffer(file);
}

/* ====== Xuất PDF ====== */
async function exportPDF() {
  if (!qrList.length) {
    alert("❗ Chưa có QR để xuất");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  for (let i = 0; i < qrList.length; i++) {
    if (i > 0) pdf.addPage();

    const item = qrList[i];
    pdf.text(`${item.bankRaw} - ${item.acc}`, 10, 10);

    const img = await loadImage(item.url);
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
