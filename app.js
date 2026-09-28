/* RUMAHFIT 2.0 - application, CRUD, calculations, LocalStorage and API adapter */
(() => {
  "use strict";

  const CFG = window.RUMAHFIT_CONFIG;
  let state = structuredClone(window.RUMAHFIT_DEFAULT);

  const $ = id => document.getElementById(id);
  const fmt = new Intl.NumberFormat("id-ID");
  const money = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
  const pct = n => `${(Number(n)||0).toFixed(1)}%`;
  const clone = x => structuredClone(x);

  function showStatus(msg){
    $("statusMessage").textContent = msg;
    bootstrap.Modal.getOrCreateInstance($("statusModal")).show();
    setTimeout(()=>bootstrap.Modal.getInstance($("statusModal"))?.hide(),1400);
  }

  /* ---------- Storage / API adapter ---------- */
  const Store = {
    saveLocal(){
      localStorage.setItem(CFG.storageKey, JSON.stringify(state));
      showStatus("Data tersimpan di LocalStorage.");
    },
    loadLocal(){
      const raw = localStorage.getItem(CFG.storageKey);
      if(raw){ state = Object.assign(clone(window.RUMAHFIT_DEFAULT), JSON.parse(raw)); }
      renderAll();
      showStatus(raw ? "Data dimuat dari LocalStorage." : "Data default digunakan.");
    },
    async api(action, payload={}){
      if(!CFG.apiUrl) throw new Error("apiUrl belum diisi.");
      const res = await fetch(CFG.apiUrl,{
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify({action,...payload})
      });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    async save(){
      this.saveLocal();
      if(CFG.apiUrl){
        try{
          await this.api("saveAll",{data:state});
          showStatus("LocalStorage + Google Sheet tersimpan.");
        }catch(e){ showStatus("LocalStorage tersimpan, API gagal: "+e.message); }
      }
    },
    async load(){
      if(CFG.apiUrl){
        try{
          const r=await this.api("getAll");
          if(r?.data) state=r.data;
        }catch(e){ console.warn(e); this.loadLocal(); return; }
      }else{
        this.loadLocal(); return;
      }
      renderAll();
    }
  };

  /* ---------- Business calculations ---------- */
  function financial(){
    const d=state.developer;
    const landCost=d.landArea*d.landPrice;
    const construction=state.units.reduce((s,u)=>s+u.qty*u.construction,0);
    const revenue=state.units.reduce((s,u)=>s+u.qty*u.price,0);
    const subtotal=landCost+construction+d.infraCost;
    const reserve=subtotal*d.reserveRate/100;
    const totalCost=subtotal+reserve;
    const profit=revenue-totalCost;
    return {landCost,construction,revenue,subtotal,reserve,totalCost,profit,margin:revenue?profit/revenue*100:0};
  }

  function matchBuyer(b){
    const ability=Math.max(0,b.income-b.expense);
    const desired=b.need.includes("3")?3:2;
    const bedroomMap={"FIT 30":2,"FIT 36":2,"FIT 45":3};
    return state.units.map(unit=>{
      const bedrooms=bedroomMap[unit.type]||2;
      const capacity=ability*60+b.dp;
      const affordability=unit.price?Math.min(capacity/unit.price,1):0;
      const bedroomScore=bedrooms===desired?1:.7;
      const dpScore=unit.price?Math.min((b.dp/unit.price)/.2,1):0;
      const familyScore=b.family>=5&&bedrooms<3?.65:1;
      const score=affordability*.45+bedroomScore*.30+dpScore*.15+familyScore*.10;
      return {unit,score,ability};
    }).sort((a,b)=>b.score-a.score)[0] || {unit:{type:"-",price:0},score:0,ability};
  }

  //function baru
function renderDeveloper() {

    $("developerForm").innerHTML = `

        ${input(
            "landArea",
            "Luas lahan (m²)",
            state.developer.landArea,
            "number"
        )}

        ${input(
            "landPrice",
            "Harga tanah / m²",
            state.developer.landPrice,
            "number"
        )}

        ${input(
            "targetUnits",
            "Target unit",
            state.developer.targetUnits,
            "number"
        )}

        ${input(
            "infraCost",
            "Infrastruktur kawasan",
            state.developer.infraCost,
            "number"
        )}

        ${input(
            "reserveRate",
            "Cadangan proyek (%)",
            state.developer.reserveRate,
            "number"
        )}

        ${input(
            "targetMargin",
            "Target margin (%)",
            state.developer.targetMargin,
            "number"
        )}

        <div class="col-12 mt-3">

            <button
                type="button"
                class="btn btn-primary"
                id="btnRecalculate"
            >
                <i class="bi bi-calculator me-1"></i>
                Hitung Ulang
            </button>

            <button
                type="button"
                class="btn btn-success ms-2"
                id="saveDeveloper"
            >
                <i class="bi bi-save me-1"></i>
                Simpan Perubahan
            </button>

        </div>
    `;


    // ==========================================
    // UPDATE STATE SAAT USER MENGETIK
    // ==========================================

    $("developerForm")
        .querySelectorAll("input")
        .forEach(el => {

            el.addEventListener("input", () => {

                state.developer[el.id] =
                    Number(el.value) || 0;

            });

        });


    // ==========================================
    // HITUNG ULANG
    // ==========================================

    const btnRecalculate = $("btnRecalculate");

    if (btnRecalculate) {

        btnRecalculate.onclick = () => {

            // Pastikan nilai input terbaru masuk state
            $("developerForm")
                .querySelectorAll("input")
                .forEach(el => {

                    state.developer[el.id] =
                        Number(el.value) || 0;

                });

            // Jalankan seluruh perhitungan
            renderAll();

        };

    }


    // ==========================================
    // SIMPAN
    // ==========================================

    const btnSave = $("saveDeveloper");

    if (btnSave) {

        btnSave.onclick = () => {

            Store.save(state);

            alert("Data developer berhasil disimpan.");

        };

    }

}

  //function baru
// function recalculateProject() {

//     calculateLandPlan();

//     calculateUnitMix();

//     calculateCost();

//     calculateRevenue();

//     calculateProfit();

//     calculateMatching();

//     calculateFinancing();

// }


  function input(id,label,value,type="text"){
    return `<div class="col-md-6"><label class="form-label">${label}</label><input id="${id}" type="${type}" class="form-control" value="${value}"></div>`;
  }

  function renderUnits(){
    $("unitTable").innerHTML=state.units.map((u,i)=>`
      <tr>
        <td><input class="form-control form-control-sm" data-i="${i}" data-f="type" value="${esc(u.type)}"></td>
        <td><input type="number" class="form-control form-control-sm" data-i="${i}" data-f="lb" value="${u.lb}"></td>
        <td><input type="number" class="form-control form-control-sm" data-i="${i}" data-f="lt" value="${u.lt}"></td>
        <td><input type="number" class="form-control form-control-sm" data-i="${i}" data-f="qty" value="${u.qty}"></td>
        <td><input type="number" class="form-control form-control-sm" data-i="${i}" data-f="price" value="${u.price}"></td>
        <td><input type="number" class="form-control form-control-sm" data-i="${i}" data-f="construction" value="${u.construction}"></td>
        <td><input class="form-control form-control-sm" data-i="${i}" data-f="buyer" value="${esc(u.buyer)}"></td>
        <td><button class="btn btn-sm btn-outline-danger" data-delete-unit="${i}"><i class="bi bi-trash"></i></button></td>
      </tr>`).join("");
    $("unitTable").querySelectorAll("input").forEach(el=>el.addEventListener("change",()=>{
      const i=+el.dataset.i,f=el.dataset.f; state.units[i][f]=["type","buyer"].includes(f)?el.value:Number(el.value)||0; renderAll();
    }));
    $("unitTable").querySelectorAll("[data-delete-unit]").forEach(b=>b.onclick=()=>{state.units.splice(+b.dataset.deleteUnit,1);renderAll();});
  }

  function renderBuyers(){
    $("buyerTable").innerHTML=state.buyers.map((b,i)=>`
      <tr>
        <td><input class="form-control form-control-sm" data-i="${i}" data-f="name" value="${esc(b.name)}"></td>
        <td><input type="number" class="form-control form-control-sm" data-i="${i}" data-f="income" value="${b.income}"></td>
        <td><input type="number" class="form-control form-control-sm" data-i="${i}" data-f="expense" value="${b.expense}"></td>
        <td><input type="number" class="form-control form-control-sm" data-i="${i}" data-f="dp" value="${b.dp}"></td>
        <td><input type="number" class="form-control form-control-sm" data-i="${i}" data-f="family" value="${b.family}"></td>
        <td><input class="form-control form-control-sm" data-i="${i}" data-f="need" value="${esc(b.need)}"></td>
        <td><button class="btn btn-sm btn-outline-danger" data-delete-buyer="${i}"><i class="bi bi-trash"></i></button></td>
      </tr>`).join("");
    $("buyerTable").querySelectorAll("input").forEach(el=>el.addEventListener("change",()=>{
      const i=+el.dataset.i,f=el.dataset.f; state.buyers[i][f]=["name","need"].includes(f)?el.value:Number(el.value)||0; renderAll();
    }));
    $("buyerTable").querySelectorAll("[data-delete-buyer]").forEach(b=>b.onclick=()=>{state.buyers.splice(+b.dataset.deleteBuyer,1);renderAll();});
  }

  function renderLand(){
    const land=state.developer.landArea;
    const lots=state.units.reduce((s,u)=>s+u.lt*u.qty,0);
    const rows=[["Kavling rumah",lots,"Kavling efektif"],["Jalan & drainase",CFG.land.road,"Akses internal"],["RTH",CFG.land.green,"Ruang terbuka"],["Fasilitas/utilitas",CFG.land.facility,"Utilitas"],["Sisa/buffer",land-lots-CFG.land.road-CFG.land.green-CFG.land.facility,"Cadangan"]];
    $("landTable").innerHTML=rows.map(r=>`<tr><td>${r[0]}</td><td>${fmt.format(r[1])}</td><td>${pct(land?r[1]/land*100:0)}</td><td>${r[2]}</td></tr>`).join("")+`<tr class="table-light fw-bold"><td>TOTAL</td><td>${fmt.format(land)}</td><td>100%</td><td></td></tr>`;
  }

  function renderCost(){
    const f=financial();
    const rows=[["Biaya tanah",f.landCost,"Lahan × harga"],["Biaya konstruksi",f.construction,"Seluruh unit"],["Infrastruktur",state.developer.infraCost,"Input developer"],["Subtotal",f.subtotal,""],["Cadangan",f.reserve,`${state.developer.reserveRate}%`],["TOTAL DEVELOPMENT COST",f.totalCost,""],["Revenue",f.revenue,""],["Gross Profit",f.profit,""],["Gross Margin",f.margin,""]];
    $("costTable").innerHTML=rows.map((r,i)=>`<tr class="${[3,5].includes(i)?"table-light fw-bold":""}"><td>${r[0]}</td><td>${i===8?pct(r[1]):money(r[1])}</td><td>${r[2]}</td></tr>`).join("");
  }

  function renderMatching(){
    $("matchingCards").innerHTML=state.buyers.map(b=>{
      const r=matchBuyer(b), score=r.score*100;
      return `<div class="card border-0 shadow-sm mb-3"><div class="card-body"><div class="row align-items-center g-3">
        <div class="col-lg-2"><strong>${esc(b.name)}</strong><div class="small text-secondary">Family ${b.family}</div></div>
        <div class="col-lg-2"><small class="text-secondary">Ability</small><div class="fw-bold">${money(r.ability)}</div></div>
        <div class="col-lg-2"><small class="text-secondary">Recommended</small><div class="fw-bold fs-5">${esc(r.unit.type)}</div></div>
        <div class="col-lg-2"><small class="text-secondary">Price</small><div class="fw-bold">${money(r.unit.price)}</div></div>
        <div class="col-lg-2"><small class="text-secondary">Fit Score</small><div class="fw-bold">${score.toFixed(0)}%</div><div class="progress"><div class="progress-bar" style="width:${score}%"></div></div></div>
        <div class="col-lg-2 small">Rule-based fit berdasarkan affordability, kebutuhan, DP dan keluarga.</div>
      </div></div></div>`;
    }).join("");
  }

  function renderMarket(){
    const count={}; state.buyers.forEach(b=>{const t=matchBuyer(b).unit.type;count[t]=(count[t]||0)+1;});
    $("marketTable").innerHTML=state.units.map(u=>{const n=count[u.type]||0,d=state.buyers.length?n/state.buyers.length*100:0;return `<tr><td><strong>${esc(u.type)}</strong></td><td>${n}</td><td>${pct(d)}</td><td>${d>=35?"Demand sample relatif tinggi":d?"Alternatif produk":"Evaluasi proporsi unit"}</td></tr>`}).join("");
  }

  function renderFinance(){
    $("financeTable").innerHTML=state.buyers.map(b=>{const r=matchBuyer(b), financing=Math.max(r.unit.price-b.dp,0), principal=financing/(CFG.financingMonths);return `<tr><td>${esc(b.name)}</td><td>${esc(r.unit.type)}</td><td>${money(r.unit.price)}</td><td>${money(b.dp)}</td><td>${money(financing)}</td><td>${money(r.ability)}</td><td>${money(principal)}</td></tr>`}).join("");
  }

  function renderGrowth(){
    $("growthTable").innerHTML=state.growth.map(r=>`<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("");
  }

  function renderDashboard(){
    const f=financial(),units=state.units.reduce((s,u)=>s+u.qty,0);
    $("kpiRow").innerHTML=[
      ["Luas Lahan",fmt.format(state.developer.landArea)+" m²","bi-map","primary"],
      ["Target Unit",fmt.format(units),"bi-houses","success"],
      ["Revenue",money(f.revenue),"bi-cash-stack","info"],
      ["Gross Margin",pct(f.margin),"bi-percent","warning"]
    ].map(k=>`<div class="col-6 col-xl-3"><div class="card stat-card shadow-sm h-100"><div class="card-body d-flex justify-content-between"><div><small class="text-secondary">${k[0]}</small><h4 class="fw-bold mt-2">${k[1]}</h4></div><div class="stat-icon bg-${k[3]}-subtle text-${k[3]}"><i class="bi ${k[2]}"></i></div></div></div></div>`).join("");
    $("financialSummary").innerHTML=`<div class="row g-3">
      <div class="col-md-4"><div class="border rounded p-3"><small>Development Cost</small><div class="fw-bold fs-5">${money(f.totalCost)}</div></div></div>
      <div class="col-md-4"><div class="border rounded p-3"><small>Gross Profit</small><div class="fw-bold fs-5">${money(f.profit)}</div></div></div>
      <div class="col-md-4"><div class="border rounded p-3"><small>Reserve</small><div class="fw-bold fs-5">${money(f.reserve)}</div></div></div>
    </div>`;
    $("dashboardMatching").innerHTML=state.buyers.map(b=>{const r=matchBuyer(b);return `<div class="d-flex justify-content-between mb-3"><div><strong>${esc(b.name)}</strong><div class="small text-secondary">${esc(r.unit.type)}</div></div><span class="badge text-bg-primary">${(r.score*100).toFixed(0)}%</span></div>`}).join("");
  }

  function renderAll(){ renderDeveloper();renderUnits();renderBuyers();renderLand();renderCost();renderMatching();renderMarket();renderFinance();renderGrowth();renderDashboard(); }

  /* ---------- CRUD ---------- */
  $("addUnit").onclick=()=>{state.units.push({type:"FIT Baru",lb:30,lt:60,qty:0,price:0,construction:0,buyer:""});renderAll();};
  $("addBuyer").onclick=()=>{state.buyers.push({name:"Buyer Baru",income:0,expense:0,dp:0,family:1,need:"2 kamar"});renderAll();};
  $("btnSave").onclick=()=>Store.save();
  $("btnLoad").onclick=()=>Store.load();

  /* ---------- SPA navigation ---------- */
  const titles={dashboard:"Executive Dashboard",developer:"Developer Input",unitmix:"Unit Mix",landplan:"Land Plan",cost:"Development Cost Engine",buyers:"Buyer Profiles",matching:"Buyer Matching Engine",market:"Market Demand Insight",financing:"Financing Scenario",growth:"Growth Plan"};
  document.querySelectorAll("[data-page]").forEach(a=>a.onclick=e=>{e.preventDefault();document.querySelectorAll(".page-section").forEach(s=>s.classList.remove("active"));$(a.dataset.page).classList.add("active");document.querySelectorAll("[data-page]").forEach(x=>x.classList.remove("active"));a.classList.add("active");$("pageTitle").textContent=titles[a.dataset.page];});

  /* ---------- Export Excel ---------- */
  $("exportExcel").onclick=()=>{
    const wb=XLSX.utils.book_new();
    const f=financial();
    const sheets={
      Dashboard:[
        ["RUMAHFIT 2.0",""],
        ["Luas Lahan",state.developer.landArea],
        ["Target Unit",state.developer.targetUnits],
        ["Revenue",f.revenue],
        ["Development Cost",f.totalCost],
        ["Gross Profit",f.profit],
        ["Gross Margin",f.margin]
      ],
      Developer:Object.entries(state.developer).map(x=>[x[0],x[1]]),
      Unit_Mix:[["Tipe","LB","LT","Jumlah","Harga Jual","Konstruksi","Target Buyer"],...state.units.map(u=>[u.type,u.lb,u.lt,u.qty,u.price,u.construction,u.buyer])],
      Buyers:[["Buyer","Income","Expense","DP","Family","Need"],...state.buyers.map(b=>[b.name,b.income,b.expense,b.dp,b.family,b.need])],
      Matching:[["Buyer","Recommended","Price","Score"],...state.buyers.map(b=>{const r=matchBuyer(b);return[b.name,r.unit.type,r.unit.price,r.score*100]})]
    };
    Object.entries(sheets).forEach(([name,data])=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),name));
    XLSX.writeFile(wb,"RUMAHFIT_2.0_Report.xlsx");
  };

  /* ---------- Export PDF ---------- */
  $("exportPdf").onclick=()=>{
    const {jsPDF}=window.jspdf,doc=new jsPDF();
    const f=financial();
    doc.setFontSize(18);doc.text("RUMAHFIT 2.0",14,18);
    doc.setFontSize(11);doc.text("Developer Buyer Matching Report",14,26);
    const lines=[
      `Luas Lahan: ${fmt.format(state.developer.landArea)} m2`,
      `Target Unit: ${fmt.format(state.developer.targetUnits)}`,
      `Revenue: ${money(f.revenue)}`,
      `Development Cost: ${money(f.totalCost)}`,
      `Gross Profit: ${money(f.profit)}`,
      `Gross Margin: ${pct(f.margin)}`,
      "",
      "BUYER MATCHING"
    ];
    let y=38; lines.forEach(t=>{doc.text(t,14,y);y+=7;});
    state.buyers.forEach(b=>{const r=matchBuyer(b);doc.text(`${b.name}: ${r.unit.type} | ${money(r.unit.price)} | Score ${(r.score*100).toFixed(0)}%`,14,y);y+=7;if(y>280){doc.addPage();y=20;}});
    doc.save("RUMAHFIT_2.0_Report.pdf");
  };

  function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

  renderAll();
})();
