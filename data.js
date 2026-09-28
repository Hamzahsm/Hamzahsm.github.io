/* RUMAHFIT 2.0 - initial data and configuration */
window.RUMAHFIT_CONFIG = {
  storageKey: "rumahfit_2_0_state",
  apiUrl: "", // isi URL Web App Apps Script jika sudah tersedia
  currency: "IDR",
  financingMonths: 240,
  land: { road: 2200, green: 800, facility: 500 }
};

window.RUMAHFIT_DEFAULT = {
  version: 1,
  developer: {
    landArea: 10000,
    landPrice: 1500000,
    targetUnits: 100,
    infraCost: 15000000000,
    reserveRate: 5,
    targetMargin: 20
  },
  units: [
    {type:"FIT 30",lb:30,lt:60,qty:25,price:250000000,construction:140000000,buyer:"Pasangan muda"},
    {type:"FIT 36",lb:36,lt:72,qty:50,price:300000000,construction:165000000,buyer:"Keluarga kecil"},
    {type:"FIT 45",lb:45,lt:90,qty:25,price:375000000,construction:205000000,buyer:"Keluarga berkembang"}
  ],
  buyers: [
    {name:"Buyer A",income:7000000,expense:4500000,dp:40000000,family:4,need:"2 kamar"},
    {name:"Buyer B",income:9000000,expense:5500000,dp:60000000,family:4,need:"2–3 kamar"},
    {name:"Buyer C",income:5500000,expense:3500000,dp:30000000,family:3,need:"2 kamar"},
    {name:"Buyer D",income:12000000,expense:7000000,dp:75000000,family:5,need:"3 kamar"},
    {name:"Buyer E",income:8000000,expense:5000000,dp:50000000,family:4,need:"2 kamar"}
  ],
  growth: [
    ["FIT 30","Rumah inti 30 m²","Tambah kamar","Ruang fleksibel"],
    ["FIT 36","Rumah inti 36 m²","Tambah kamar / ruang","Ruang usaha"],
    ["FIT 45","Rumah inti 45 m²","Perluasan ruang keluarga","Ruang usaha / lantai 2"]
  ]
};
