let qrList = [];
let errorList = [];

/* ================= CHUẨN HOÁ TEXT ================= */
function normalizeText(str){
  return str.toLowerCase().replace(/\s+/g,"").replace(/[^a-z0-9]/g,"");
}

/* ================= MAP NGÂN HÀNG ================= */
const BANK_MAP = {
  "vietcombank":"VCB","vcb":"VCB",
  "vietinbank":"VietinBank","ctg":"VietinBank","Vietinbank":"VietinBank","vieTinbank":"VietinBank","vietinBank":"VietinBank",
  "bidv":"BIDV",
  "agribank":"AGRIBANK",
  "techcombank":"TCB","tcb":"TCB",
  "mbbank":"MB","mb":"MB","nganhangquandoi":"MB",
  "acb":"ACB","sacombank":"STB","vpbank":"VPB",
  "tpbank":"TPB","shb":"SHB","hdbank":"HDB",
  "ocb":"OCB","msb":"MSB","maritimebank":"MSB",
  "eximbank":"EIB","seabank":"SEAB","vib":"VIB",
  "scb":"SCB","abbank":"ABB","namabank":"NAB",
  "baovietbank":"BVB","kienlongbank":"KLB",
  "vietabank":"VAB","bacabank":"BAB",
  "pvcombank":"PVCB","saigonbank":"SGB",
  "vietbank":"VBB","dongabank":"DAB",
  "lienvietpostbank":"LPB","lpbank":"LPB",
  "oceanbank":"OJB","gpbank":"GPB","cbbank":"CBB"
};

function getBankCode(raw){
  if(!raw) return null;
  return BANK_MAP[normalizeText(raw)] || null;
}

/* ================= TẢI FILE MẪU ================= */
function downloadTemplate(){
  const ws = XLSX.utils.aoa_to_sheet([
    ["STK","Ngân hàng"],
    ["1049984441","Vietcombank"],
    ["6886241206","MB Bank"],
    ["4552733316","BIDV"]
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Template");
  XLSX.writeFile(wb,"mau_qr.xlsx");
}

/* ================= XỬ LÝ EXCEL ================= */
function processExcel(){
  const fileInput = document.getElementById("fileInput");
  const des = document.getElementById("desInput").value.trim();
  const amount = document.getElementById("amountInput").value.trim();

  if(!fileInput.files.length) return alert("Chọn file Excel");
  if(!des) return alert("Nhập nội dung chuyển khoản");

  qrList = [];
  errorList = [];
  document.getElementById("preview").innerHTML = "";

  const reader = new FileReader();
  reader.onload = e => {
    const data = new Uint8Array(e.target.result);
    const wb = XLSX.read(data,{type:"array"});
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet,{defval:""});

    rows.forEach((row,idx)=>{
      const r = {};
      Object.keys(row).forEach(k=>r[k.toLowerCase().trim()] = row[k]);

      const acc = String(
        r["stk"]||r["so tk"]||r["sotk"]||r["tai khoan"]||""
      ).trim();

      const bankRaw = String(
        r["ngân hàng"]||r["ngan hang"]||r["bank"]||""
      ).trim();

      const bankCode = getBankCode(bankRaw);

      if(!acc){
        errorList.push({row:idx+2,stk:"",bank:bankRaw,reason:"Thiếu số tài khoản"});
        return;
      }
      if(!bankCode){
        errorList.push({row:idx+2,stk:acc,bank:bankRaw,reason:"Không nhận diện được ngân hàng"});
        return;
      }

      let url = `https://qr.sepay.vn/img?acc=${acc}&bank=${bankCode}`;

      if(amount !== ""){
        url += `&amount=${amount}`;
      }

      if(des !== ""){
        url += `&des=${encodeURIComponent(des)}`;
      }

      url += `&template=compact&download=1`;

      qrList.push({acc,bankRaw,bankCode,url});
    });

    rerender();
    buildBankFilter();
    renderErrors();

    alert(`✅ Thành công: ${qrList.length}\n❌ Lỗi: ${errorList.length}`);
  };

  reader.readAsArrayBuffer(fileInput.files[0]);
}

/* ================= RENDER ================= */
function rerender(){
  const preview = document.getElementById("preview");
  preview.innerHTML="";
  qrList.forEach((it,idx)=>renderCard(it,idx));
  applyFilter();
}

function renderCard(item,index){
  const card=document.createElement("div");
  card.className="card";
  card.dataset.acc=item.acc;
  card.dataset.bank=item.bankCode;

  const des=document.getElementById("desInput").value.trim();

  card.innerHTML=`
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

/* ================= SỬA ================= */
function editItem(index){
  const it = qrList[index];
  const amount = document.getElementById("amountInput").value.trim();
  const des = document.getElementById("desInput").value.trim();

  const newAcc = prompt("Sửa STK:", it.acc);
  if(!newAcc) return;

  const newBank = prompt("Sửa Ngân hàng:", it.bankRaw);
  if(!newBank) return;

  const code = getBankCode(newBank);
  if(!code) return alert("Không nhận diện được ngân hàng");

  it.acc = newAcc.trim();
  it.bankRaw = newBank.trim();
  it.bankCode = code;

  let url = `https://qr.sepay.vn/img?acc=${it.acc}&bank=${it.bankCode}`;

  if(amount !== ""){
    url += `&amount=${amount}`;
  }

  if(des !== ""){
    url += `&des=${encodeURIComponent(des)}`;
  }

  url += `&template=compact&download=1`;

  it.url = url;
  rerender();
}

/* ================= XOÁ ================= */
function deleteItem(index){
  if(!confirm("Bạn chắc chắn muốn xoá?")) return;
  qrList.splice(index,1);
  rerender();
}

/* ================= FILTER ================= */
function applyFilter(){
  const kw=document.getElementById("searchInput").value.trim();
  const bank=document.getElementById("bankFilter").value;

  document.querySelectorAll(".card").forEach(c=>{
    const acc=c.dataset.acc;
    const b=c.dataset.bank;

    let show=true;
    if(kw && !acc.includes(kw)) show=false;
    if(bank && b!==bank) show=false;

    c.style.display=show?"flex":"none";
  });
}

/* ================= BUILD FILTER ================= */
function buildBankFilter(){
  const sel=document.getElementById("bankFilter");
  sel.innerHTML=`<option value="">🏷 Tất cả ngân hàng</option>`;

  [...new Set(qrList.map(i=>i.bankCode))].forEach(b=>{
    const o=document.createElement("option");
    o.value=b;o.textContent=b;
    sel.appendChild(o);
  });
}

/* ================= HIỂN THỊ LỖI ================= */
function renderErrors(){
  const sec=document.getElementById("errorSection");
  const tbody=document.querySelector("#errorTable tbody");
  tbody.innerHTML="";

  if(!errorList.length){
    sec.style.display="none";
    return;
  }

  errorList.forEach(e=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${e.row}</td>
      <td>${e.stk||"-"}</td>
      <td>${e.bank||"-"}</td>
      <td>${e.reason}</td>
    `;
    tbody.appendChild(tr);
  });

  sec.style.display="block";
}
