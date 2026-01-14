let qrList = [];
let errorList = [];

/* ===== Chuẩn hoá text ===== */
function normalizeText(str){
  return (str||"").toLowerCase().replace(/\s+/g,"").replace(/[^a-z0-9]/g,"");
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
  "sacombank":"STB","stb":"STB",
  "vpbank":"VPB",
  "tpbank":"TPB"
};

/* ===== Tải file mẫu ===== */
function downloadTemplate(){
  const ws = XLSX.utils.aoa_to_sheet([
    ["STK","NGAN_HANG"],
    ["0123456789","Vietcombank"]
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"DATA");
  XLSX.writeFile(wb,"qr_template.xlsx");
}

/* ===== Đọc Excel ===== */
function processExcel(){
  const file = document.getElementById("fileInput").files[0];
  const des  = document.getElementById("desInput").value || "";

  if(!file){
    alert("Vui lòng chọn file Excel");
    return;
  }

  qrList = [];
  errorList = [];
  document.getElementById("preview").innerHTML = "";
  document.getElementById("errorTable").querySelector("tbody").innerHTML = "";

  const reader = new FileReader();
  reader.onload = e=>{
    const data = new Uint8Array(e.target.result);
    const wb = XLSX.read(data,{type:"array"});
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet,{defval:""});

    rows.forEach((r,i)=>{
      const stk  = String(r.STK||"").trim();
      const bank = normalizeText(r.NGAN_HANG);

      if(!stk || !bank || !BANK_MAP[bank]){
        errorList.push({
          row:i+2,
          stk,
          bank:r.NGAN_HANG,
          reason:"Thiếu STK hoặc ngân hàng không hợp lệ"
        });
        return;
      }

      const bankCode = BANK_MAP[bank];
      const qrUrl = `https://api.vietqr.io/image/${bankCode}/${stk}?addInfo=${encodeURIComponent(des)}`;

      qrList.push({
        stk,
        bank:bankCode,
        des,
        url:qrUrl
      });
    });

    renderQR();
    renderErrors();
    buildBankFilter();
  };
  reader.readAsArrayBuffer(file);
}

/* ===== Render QR ===== */
function renderQR(){
  const box = document.getElementById("preview");
  box.innerHTML = "";

  qrList.forEach((it,idx)=>{
    const div = document.createElement("div");
    div.className="card";
    div.innerHTML=`
      <div class="bank">${it.bank}</div>
      <div class="acc">${it.stk}</div>
      <div class="des">${it.des}</div>
      <img src="${it.url}">
      <div class="actions">
        <button class="mini danger" onclick="deleteQR(${idx})">Xoá</button>
      </div>
      <a href="${it.url}" target="_blank">Mở ảnh</a>
    `;
    box.appendChild(div);
  });
}

function deleteQR(i){
  qrList.splice(i,1);
  renderQR();
}

/* ===== Render lỗi ===== */
function renderErrors(){
  const sec = document.getElementById("errorSection");
  const body = document.querySelector("#errorTable tbody");

  if(errorList.length===0){
    sec.style.display="none";
    return;
  }
  sec.style.display="block";
  body.innerHTML="";

  errorList.forEach(e=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${e.row}</td>
      <td>${e.stk}</td>
      <td>${e.bank}</td>
      <td>${e.reason}</td>
    `;
    body.appendChild(tr);
  });
}

/* ===== Filter ===== */
function buildBankFilter(){
  const sel = document.getElementById("bankFilter");
  sel.innerHTML=`<option value="">🏷 Tất cả ngân hàng</option>`;
  [...new Set(qrList.map(i=>i.bank))].forEach(b=>{
    const o=document.createElement("option");
    o.value=b;o.textContent=b;
    sel.appendChild(o);
  });
}

function applyFilter(){
  const key  = document.getElementById("searchInput").value.trim();
  const bank = document.getElementById("bankFilter").value;
  const cards = document.querySelectorAll(".card");

  cards.forEach(c=>{
    const acc = c.querySelector(".acc").textContent;
    const b   = c.querySelector(".bank").textContent;

    let ok=true;
    if(key && !acc.includes(key)) ok=false;
    if(bank && bank!==b) ok=false;

    c.style.display = ok?"":"none";
  });
}

/* ===== Xuất Excel kết quả (1 sheet, tô đỏ lỗi) ===== */
function exportResultExcel(){
  const data = [
    ["STK","NGÂN HÀNG","TRẠNG THÁI","LỖI"]
  ];

  qrList.forEach(i=>{
    data.push([i.stk,i.bank,"OK",""]);
  });

  errorList.forEach(e=>{
    data.push([e.stk,e.bank,"ERROR",e.reason]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  // tô đỏ dòng lỗi
  data.forEach((r,i)=>{
    if(r[2]==="ERROR"){
      ["A","B","C","D"].forEach(c=>{
        const cell = ws[c+(i+1)];
        if(cell){
          cell.s = { fill:{fgColor:{rgb:"FFCDD2"}} };
        }
      });
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"RESULT");
  XLSX.writeFile(wb,"qr_result.xlsx");
}

/* ===== Xuất PDF ===== */
async function exportPDF(){
  if(qrList.length===0){
    alert("Chưa có QR để xuất PDF");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  for(let i=0;i<qrList.length;i++){
    if(i>0) pdf.addPage();
    const img = await loadImage(qrList[i].url);
    pdf.addImage(img,"PNG",25,30,160,160);
    pdf.text(`${qrList[i].bank} - ${qrList[i].stk}`,20,20);
  }
  pdf.save("qr_output.pdf");
}

function loadImage(url){
  return new Promise(res=>{
    const img=new Image();
    img.crossOrigin="anonymous";
    img.onload=()=>res(img);
    img.src=url;
  });
}
