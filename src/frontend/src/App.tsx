import { useEffect, useState } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const today = new Date().toISOString().split("T")[0];

// ─── Smart Billing Types ──────────────────────────────────────────────────────

interface SmartBill {
  id: number;
  billNumber: string;
  date: string;
  state: string;
  district: string;
  block: string;
  panchayat: string;
  material: string;
  rate: number;
  quantity: number;
  amount: number;
  transport: number;
  paid: number;
  pending: number;
  vendor: string;
  financialYear: string;
}

const STORAGE_KEY = "jeevika_secure_billing";
const KHATA_KEY = "jeevika_khata_bahi";

// ─── Khata Bahi Types ─────────────────────────────────────────────────────────

interface KhataEntry {
  id: number;
  billNumber: string;
  date: string;
  customerName: string;
  block: string;
  panchayat: string;
  material: string;
  quantity: number;
  rate: number;
  amount: number;
  paid: number;
  pending: number;
  remarks: string;
}

function generateKhataNumber(entries: KhataEntry[]): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const c = entries.length + 1;
  return `KHB/${y}${m}/${String(c).padStart(4, "0")}`;
}

function saveKhataToStorage(entries: KhataEntry[]): void {
  localStorage.setItem(KHATA_KEY, JSON.stringify(entries));
}

const PANCHAYAT_MAP: Record<string, string[]> = {
  HARSIDHI: [
    "BAIRIYADIH",
    "BHADA",
    "CHAR RAHIYA",
    "DHIWADHAR",
    "GAYGJAT",
    "HARPUR",
    "HARSIDHI PAKARIYA",
    "JAGAPAKAR",
    "KANCHHEDWA",
    "KRIT PUR",
    "MANIK PUR",
    "MATHLOHIYAR",
    "MATIYARIYA",
    "MURAR PUR OLAHA",
    "MENATA TOLA PANAPUR",
    "RANJITA",
    "SONBARSA",
    "UJJAIN LOHIYAR",
    "YADAVPUR",
  ],
  TURKAULIA: [
    "BELWA RAY",
    "BIJUL PUR",
    "CHARGHA",
    "HARDIYA",
    "JAISINGHPUR EAST",
    "JAISINGHPUR NORTH",
    "JAISINGHPUR SOUTH",
    "MADHOPUR MADHUMALAT",
    "MATHURAPUR",
    "RAGHUNATHPUR",
    "SAPAHI",
    "SHANKAR SARAYA NORTH",
    "SARAYA SOUTH",
    "TURKAULI EAST",
    "TURKAULI MIDDLE",
    "TURKAULIA WEST",
  ],
  SUGAULI: [
    "BAGHI",
    "BHARGAWA",
    "BHATHA KARAMWA",
    "RAGHUNATHPUR",
    "MALI",
    "NORTH CHHAPRABAHAS",
    "NORTH SRIPUR",
    "NORTH SUGAWN",
    "PANJIARWA",
    "PHULWARIA",
    "SHUKUL PAKAR",
    "SOUTH CHHAPRABAHAS",
    "MANSINGHA",
    "SOUTH SRIPUR",
    "SOUTH SUGAWN",
    "UTTARI MANSINGHA",
  ],
  Banjariya: [
    "AJGARI",
    "BANJARIYA",
    "CHAILAHA EAST",
    "PANCHRUKHA",
    "EAST SISWA",
    "JANERWA MADHYA",
    "NORTH FULWAR",
    "ROHINIYA",
    "SEMRA",
    "SOUTH FULWAR WEST",
    "WEST SISWA",
  ],
  MOTIHARI: [
    "BARDAHA",
    "BARIYAR PUR",
    "BARWA",
    "BASMANPUR",
    "CHANDRAHIYA",
    "CHHATAUNI AMAR DHRUV",
    "LAKHAURA",
    "GORHWA",
    "JHITKAHIYA",
    "KATHAN",
    "MADHUBANI GHAT",
    "NARURANGIYA",
    "NORTH DHEKAHAN",
    "PATAURA",
    "RAMGARWA",
    "RAMSINGH CHHATAUNI",
    "RULAHI",
    "SIRSAMAL",
    "TIKULIYA",
    "WEST DHEKAHA",
  ],
};

const ALL_BLOCKS = [
  "ADAPUR",
  "ARERAJ",
  "Banjariya",
  "Bankatwa",
  "CHAKIA (PIPRA)",
  "Chawradano",
  "CHIRAIYA",
  "DHAKA",
  "GHORASAHAN",
  "HARSIDHI",
  "KALYANPUR",
  "KESARIA",
  "Kotwa",
  "MADHUBAN",
  "MEHSI",
  "MOTIHARI",
  "PAHARPUR",
  "PAKRIDAYAL",
  "PATAHI",
  "Phenhara",
  "Pipra Kothi",
  "RAMGARHWA",
  "RAXAUL",
  "Sangrampur",
  "SUGAULI",
  "Tetariya",
  "TURKAULIA",
];

function generateBillNumber(bills: SmartBill[]): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const c = bills.length + 1;
  return `JDN/${y}${m}/${String(c).padStart(4, "0")}`;
}

function computeAmount(rate: string, qty: string): number {
  return (Number.parseFloat(rate) || 0) * (Number.parseFloat(qty) || 0);
}

function computePending(
  rate: string,
  qty: string,
  transport: string,
  paid: string,
): number {
  const total = computeAmount(rate, qty) + (Number.parseFloat(transport) || 0);
  return Math.max(0, total - (Number.parseFloat(paid) || 0));
}

function getPaymentStatus(bill: SmartBill): { text: string; isPaid: boolean } {
  const total = bill.amount + (bill.transport || 0);
  if (bill.paid >= total) return { text: "पूर्ण भुगतान", isPaid: true };
  if (bill.paid > 0) return { text: "आंशिक भुगतान", isPaid: false };
  return { text: "बकाया", isPaid: false };
}

function saveBillsToStorage(bills: SmartBill[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
}

function generatePrintHTML(
  billsToPrint: SmartBill[],
  title: string,
  finYear: string,
): string {
  const totalAmt = billsToPrint.reduce((s, b) => s + b.amount, 0);
  const totalTrans = billsToPrint.reduce((s, b) => s + (b.transport || 0), 0);
  const totalPaid = billsToPrint.reduce((s, b) => s + (b.paid || 0), 0);
  const totalPending = billsToPrint.reduce((s, b) => s + (b.pending || 0), 0);
  const grand = totalAmt + totalTrans;
  const rows = billsToPrint
    .map((b, i) => {
      const total = b.amount + (b.transport || 0);
      const status =
        b.pending === 0 ? "पूर्ण भुगतान" : b.paid > 0 ? "आंशिक" : "बकाया";
      return `<tr><td>${i + 1}</td><td>${b.billNumber}</td><td>${b.date}</td><td>${b.block}</td><td>${b.panchayat}</td><td>${b.material}</td><td>₹${b.rate}</td><td>${b.quantity}</td><td>₹${b.amount.toFixed(2)}</td><td>₹${(b.transport || 0).toFixed(2)}</td><td>₹${total.toFixed(2)}</td><td>₹${(b.paid || 0).toFixed(2)}</td><td>₹${(b.pending || 0).toFixed(2)}</td><td>${status}</td><td>${b.vendor}</td></tr>`;
    })
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>body{font-family:Arial;margin:20px;}.print-header{text-align:center;border-bottom:2px solid #2b8c4a;margin-bottom:20px;}.print-table{border-collapse:collapse;width:100%;font-size:9px;}.print-table th,.print-table td{border:1px solid #000;padding:4px;}</style></head><body><div class="print-header"><h2>🌿 जीविका दीदी ग्रीन नर्सरी, प्लांटेशन-गेबियन (बांस गेबियन)</h2><p><strong>प्रभारी दीदी:</strong> रुकमीना देवी | <strong>संचालक:</strong> बुलेट प्रसाद</p><p><strong>पता:</strong> ग्राम - पकरिया, पोस्ट- अजगरी, थाना- बंजरिया, जिला- पूर्वी चंपारण, पिन-845401</p><p><strong>मोबाइल:</strong> 8292480148, 9504800073 | वित्तीय वर्ष: ${finYear}</p><h3>${title}</h3><p>कुल बिल: ${billsToPrint.length} | तिथि: ${new Date().toLocaleString()}</p></div><table class="print-table"><thead><tr><th>क्र.</th><th>बिल नं.</th><th>तिथि</th><th>ब्लॉक</th><th>पंचायत</th><th>सामग्री</th><th>दर</th><th>मात्रा</th><th>राशि</th><th>गाड़ी</th><th>कुल</th><th>प्राप्त</th><th>बकाया</th><th>स्थिति</th><th>विक्रेता</th></tr></thead><tbody>${rows}<tr style="font-weight:bold"><td colspan="8" align="right">कुल योग</td><td>₹${totalAmt.toFixed(2)}</td><td>₹${totalTrans.toFixed(2)}</td><td>₹${grand.toFixed(2)}</td><td>₹${totalPaid.toFixed(2)}</td><td>₹${totalPending.toFixed(2)}</td><td colspan="2"></td></tr></tbody></table><div><p>हस्ताक्षर : ___________ &nbsp;&nbsp; दिनांक : ${new Date().toLocaleDateString()}</p><p>© जीविका दीदी ग्रीन नर्सरी</p></div></body></html>`;
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeSection, setActiveSection] = useState("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollVisible, setScrollVisible] = useState(false);

  // Khata Bahi login state
  const [isKhataLoggedIn, setIsKhataLoggedIn] = useState(false);
  const [showKhataModal, setShowKhataModal] = useState(false);
  const [khataUser, setKhataUser] = useState("");
  const [khataPwd, setKhataPwd] = useState("");
  const [khataError, setKhataError] = useState("");

  // Khata Bahi data state
  const [khataEntries, setKhataEntries] = useState<KhataEntry[]>(() => {
    const stored = localStorage.getItem(KHATA_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        /* ignore */
      }
    }
    return [];
  });
  const [editingKhata, setEditingKhata] = useState<KhataEntry | null>(null);
  const [kbCustomer, setKbCustomer] = useState("");
  const [kbBlock, setKbBlock] = useState("");
  const [kbPanchayat, setKbPanchayat] = useState("");
  const [kbMaterial, setKbMaterial] = useState("");
  const [kbQty, setKbQty] = useState("");
  const [kbRate, setKbRate] = useState("");
  const [kbDate, setKbDate] = useState(today);
  const [kbPaid, setKbPaid] = useState("0");
  const [kbBillNo, setKbBillNo] = useState("");
  const [kbRemarks, setKbRemarks] = useState("");
  const [kbSearchCustomer, setKbSearchCustomer] = useState("");
  const [kbFilterBlock, setKbFilterBlock] = useState("");
  const [kbFilterPanchayat, setKbFilterPanchayat] = useState("");

  // Smart Billing System (localStorage)
  const [smartBills, setSmartBills] = useState<SmartBill[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        /* ignore */
      }
    }
    const seed: SmartBill = {
      id: Date.now(),
      billNumber: "JDN/202501/0001",
      date: new Date().toISOString().slice(0, 10),
      state: "बिहार",
      district: "पूर्वी चंपारण",
      block: "Banjariya",
      panchayat: "AJGARI",
      material: "बांस गेबियन",
      rate: 450,
      quantity: 10,
      amount: 4500,
      transport: 500,
      paid: 3000,
      pending: 2000,
      vendor: "RUKMINA DEVI",
      financialYear: "2025-2026",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([seed]));
    return [seed];
  });
  const [globalFinancialYear, setGlobalFinancialYear] = useState("2025-2026");
  const [editingSmartBill, setEditingSmartBill] = useState<SmartBill | null>(
    null,
  );

  // Bill form state
  const [sbBlock, setSbBlock] = useState("");
  const [sbPanchayat, setSbPanchayat] = useState("");
  const [sbBillNumber, setSbBillNumber] = useState("");
  const [sbMaterial, setSbMaterial] = useState("");
  const [sbVendor, setSbVendor] = useState("RUKMINA DEVI");
  const [sbRate, setSbRate] = useState("");
  const [sbQty, setSbQty] = useState("");
  const [sbTransport, setSbTransport] = useState("0");
  const [sbPaid, setSbPaid] = useState("0");
  const [sbDate, setSbDate] = useState(today);
  const [sbFinYear, setSbFinYear] = useState("2025-2026");

  // Filter state
  const [filterBlock, setFilterBlock] = useState("");
  const [filterPanchayat, setFilterPanchayat] = useState("");
  const [filterBillNo, setFilterBillNo] = useState("");
  const [filterMaterial, setFilterMaterial] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterPayment, setFilterPayment] = useState("");

  // ── Scroll top ──
  useEffect(() => {
    const handler = () => setScrollVisible(window.scrollY > 300);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // ── Login ──
  function handleLogin() {
    if (
      loginUsername === "JEEVIKA DIDI GREEN NURSERY" &&
      loginPassword === "Jeevika@123"
    ) {
      setIsLoggedIn(true);
      setShowLoginModal(false);
      setLoginError("");
      setLoginUsername("");
      setLoginPassword("");
      setActiveSection("ledger");
    } else {
      setLoginError("गलत यूजरनेम या पासवर्ड!");
    }
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setActiveSection("home");
  }

  function handleKhataLogin() {
    if (khataUser === "jeevikadidigreennursery" && khataPwd === "Jeevika") {
      setIsKhataLoggedIn(true);
      setShowKhataModal(false);
      setKhataError("");
      setKhataUser("");
      setKhataPwd("");
      setActiveSection("khataBahi");
    } else {
      setKhataError("गलत यूजरनेम या पासवर्ड!");
    }
  }

  function handleKhataLogout() {
    setIsKhataLoggedIn(false);
    setActiveSection("home");
  }

  // ── Nav ──
  function navigate(section: string) {
    if (section === "ledger" && !isLoggedIn) {
      setShowLoginModal(true);
    } else if (section === "khataBahi" && !isKhataLoggedIn) {
      setShowKhataModal(true);
    } else {
      setActiveSection(section);
    }
    setMenuOpen(false);
  }

  function renderHome() {
    return (
      <>
        {/* Hero */}
        <div className="hero">
          <div className="hero-title">🌿 जीविका दीदी ग्रीन नर्सरी</div>
          <div className="hero-subtitle">स्थापना 2022 | पूर्वी चंपारण, बिहार</div>
        </div>

        <div className="section">
          {/* About cards */}
          <div className="grid-2" style={{ marginBottom: "2.5rem" }}>
            <div className="card">
              <span className="card-icon">🌳</span>
              <h3>स्थापना 2022</h3>
              <p style={{ fontSize: "0.93rem", lineHeight: 1.7 }}>
                जीविका दीदी ग्रीन नर्सरी की स्थापना 2022 में पूर्वी चंपारण, बिहार में की
                गई। यह नर्सरी जीविका समूह की महिलाओं द्वारा संचालित है और पर्यावरण
                संरक्षण के साथ-साथ महिला सशक्तिकरण की दिशा में काम कर रही है।
              </p>
            </div>
            <div className="card">
              <span className="card-icon">✋</span>
              <h3>हमारी विशेषताएँ</h3>
              <ul className="checklist">
                <li>फलदार, फूल, औषधीय, सजावटी और छायादार पौधे</li>
                <li>21 दिन का व्यावसायिक प्रशिक्षण</li>
                <li>प्रमाणित सर्टिफिकेट + QR कोड</li>
                <li>ब्लॉक/पंचायत स्तर पर डिलीवरी</li>
                <li>थोक में विशेष छूट उपलब्ध</li>
              </ul>
            </div>
          </div>

          {/* Services */}
          <h2 className="section-title">🌱 हमारी सेवाएं</h2>
          <div className="grid-3">
            {[
              {
                icon: "🌲",
                title: "फलदार पौधे",
                desc: "आम, जामुन, लीची, अमरूद, आंवला",
              },
              {
                icon: "🌸",
                title: "फूल के पौधे",
                desc: "गुलाब, अशोक और विभिन्न फूल",
              },
              {
                icon: "🌿",
                title: "औषधीय पौधे",
                desc: "तुलसी, नीम, आंवला और अन्य",
              },
              {
                icon: "🌴",
                title: "छायादार पौधे",
                desc: "बरगद, पीपल, कदंब, अर्जुन",
              },
              {
                icon: "🎓",
                title: "प्रशिक्षण",
                desc: "21 दिन का व्यावहारिक प्रशिक्षण",
              },
              { icon: "📜", title: "सर्टिफिकेट", desc: "QR कोड सहित प्रमाण पत्र" },
            ].map((s) => (
              <div className="service-card" key={s.title}>
                <span className="icon">{s.icon}</span>
                <h4>{s.title}</h4>
                <p style={{ fontSize: "0.88rem", color: "#555" }}>{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="quote-block">
            💚 &quot;पौधे लगाएं, पर्यावरण बचाएं और एक हरा-भरा भविष्य बनाएं। जीविका
            दीदी ग्रीन नर्सरी आपके साथ है।&quot;
          </div>
        </div>
      </>
    );
  }

  function renderPlants() {
    const plants = [
      ["कदंब", "छायादार / सजावटी"],
      ["आम", "फलदार"],
      ["जामुन", "फलदार / औषधीय"],
      ["अर्जुन", "औषधीय / छायादार"],
      ["महोगनी", "इमारती लकड़ी"],
      ["सागवान", "इमारती लकड़ी"],
      ["लीची", "फलदार"],
      ["अमरूद", "फलदार"],
      ["नीम", "औषधीय / छायादार"],
      ["आंवला", "फलदार / औषधीय"],
      ["अशोक", "सजावटी / छायादार"],
      ["गुलाब", "फूल"],
      ["तुलसी", "औषधीय"],
      ["बरगद", "छायादार / धार्मिक"],
      ["पीपल", "छायादार / धार्मिक"],
    ];
    return (
      <div className="section">
        <h2 className="section-title">
          <i className="fas fa-leaf" /> पौधों की सूची
        </h2>
        <p style={{ marginBottom: "1.5rem", color: "#555" }}>
          हमारी नर्सरी में निम्नलिखित पौधे उपलब्ध हैं। कीमत एवं उपलब्धता के लिए संपर्क करें।
        </p>
        <div style={{ overflowX: "auto" }}>
          <table className="plant-table">
            <thead>
              <tr>
                <th>#</th>
                <th>पौधे का नाम</th>
                <th>प्रकार / उपयोग</th>
                <th>कीमत (₹)</th>
              </tr>
            </thead>
            <tbody>
              {plants.map(([name, type], i) => (
                <tr key={name}>
                  <td>{i + 1}</td>
                  <td>
                    <strong>{name}</strong>
                  </td>
                  <td>{type}</td>
                  <td className="price-contact">संपर्क करें</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="note-block">
          <i className="fas fa-info-circle" style={{ marginRight: "0.4rem" }} />
          <strong>थोक ऑर्डर पर विशेष छूट उपलब्ध है।</strong> अधिक जानकारी के लिए
          9504800073 पर संपर्क करें।
        </div>
      </div>
    );
  }

  function renderTraining() {
    return (
      <div className="section">
        <h2 className="section-title">
          <i className="fas fa-graduation-cap" /> प्रशिक्षण कार्यक्रम
        </h2>
        <div className="grid-2">
          <div className="card">
            <h3>🎯 प्रशिक्षण की विशेषताएं</h3>
            <ul className="checklist" style={{ marginTop: "0.75rem" }}>
              <li>21 दिन का व्यावहारिक प्रशिक्षण</li>
              <li>पौधों की देखभाल और सिंचाई</li>
              <li>मिट्टी परीक्षण और खाद तैयारी</li>
              <li>नर्सरी प्रबंधन के गुर</li>
              <li>जैविक खेती की तकनीक</li>
              <li>व्यवसाय शुरू करने की जानकारी</li>
              <li>प्रमाणित सर्टिफिकेट प्रदान किया जाएगा</li>
            </ul>
          </div>
          <div className="card">
            <h3>📅 अवधि एवं संपर्क</h3>
            <p style={{ marginBottom: "0.75rem", lineHeight: 1.7 }}>
              प्रशिक्षण अवधि: <strong>21 दिन</strong>
            </p>
            <p style={{ marginBottom: "0.75rem", lineHeight: 1.7 }}>
              स्थान:{" "}
              <strong>Jeevika Didi Green Nursery, PAKADIYA, पूर्वी चंपारण</strong>
            </p>
            <p style={{ marginBottom: "1rem", lineHeight: 1.7 }}>
              समय: <strong>सुबह 8:00 – शाम 6:00</strong>
            </p>
            <a
              href="https://wa.me/919504800073"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-wa"
            >
              <i className="fab fa-whatsapp" /> WhatsApp पर संपर्क करें
            </a>
          </div>
        </div>
      </div>
    );
  }

  function renderCertificate() {
    return (
      <div className="section">
        <h2 className="section-title">
          <i className="fas fa-certificate" /> प्रमाण पत्र
        </h2>
        <div className="grid-2">
          <div className="cert-card">
            <h3 style={{ color: "var(--primary)", marginBottom: "1rem" }}>
              📜 सर्टिफिकेट के बारे में
            </h3>
            <ul className="checklist">
              <li>21 दिन के प्रशिक्षण के बाद प्रमाण पत्र दिया जाता है</li>
              <li>सर्टिफिकेट पर QR कोड होता है</li>
              <li>QR कोड स्कैन करके प्रमाण की जांच की जा सकती है</li>
              <li>सर्टिफिकेट जीविका दीदी ग्रीन नर्सरी द्वारा प्रमाणित</li>
              <li>व्यवसाय शुरू करने में सहायक</li>
            </ul>
            <p
              style={{
                marginTop: "1rem",
                color: "#555",
                fontSize: "0.93rem",
                lineHeight: 1.7,
              }}
            >
              यह सर्टिफिकेट प्रशिक्षु की योग्यता और उनके कौशल का प्रमाण है। पूर्वी चंपारण,
              बिहार में हरित उद्यमिता को बढ़ावा देने के उद्देश्य से यह कार्यक्रम चलाया जाता
              है।
            </p>
          </div>
          <div className="qr-container">
            <h3 style={{ color: "var(--primary)" }}>QR कोड</h3>
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Jeevika%20Didi%20Green%20Nursery"
              alt="QR Code"
              width={150}
              height={150}
            />
            <p style={{ color: "#555", fontSize: "0.88rem" }}>
              स्कैन करें और प्रमाण पत्र की जांच करें
            </p>
          </div>
        </div>
      </div>
    );
  }

  function renderGallery() {
    const photos = [
      {
        src: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwerQr6ugDVstJc3FjPGrVlJfsC0pTwhEyg8jSfV9FMGWhX9ZgNmwBEQPxOedNs0dmkYqYuvX0-VBxNqhxMv1uaR5amCwxlE2fpphDYqS4p-BtQjlTfm7pwsoE3oDXjmXWvTExUR-__52rp8s=w243-h244-n-k-no-nu",
        caption: "🌿 नर्सरी का मुख्य दृश्य",
      },
      {
        src: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweqBuGo8rbKvatUcSftbJuNvPdQMfw3CtlQTlJ5dDEV0isNdQ0AUC_GA4JCyu5wpyxcSTddMx09TwkD9Y8m52GDxuz8WuYyd6xxL1OuPSNQyrORDIWrI4AZPb7hKXXZy4lsWSqd0uKa05X1N=w243-h304-n-k-no-nu",
        caption: "🌱 पौध तैयार करते हुए",
      },
      {
        src: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweowQ5JsLljKSFK6mo5T3ZSylgQa8abD3HjeWPRe7TmF9yOLVYOhDatBsHgNLoocmkdtXWNf7FPZckqn6SFZaU4JZi_s5rS-65RJCPl6OEDTzhwj3goE79P5coHdnR7cy8VlMLQCj0DzmkMG=w243-h174-n-k-no-nu",
        caption: "🌸 फूलदार पौधे",
      },
      {
        src: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwepQudFJNgRHDuw1I-FI7971Z8nK7T9KwNsTtVohdZ99gYXfS8yS2d-TWfvAW0xNfKuICcw982D2XI8vOcTAXsKbE_94w8bq5plRepBGekHuLXH9kE-PifvUuLORnw_bh412xCwDQuBbsEAM=w243-h174-n-k-no-nu",
        caption: "🌳 छायादार वृक्ष",
      },
    ];
    return (
      <div className="section">
        <h2 className="section-title">
          <i className="fas fa-images" /> नर्सरी गैलरी
        </h2>
        <div className="grid-2">
          {photos.map((photo) => (
            <div className="gallery-card" key={photo.caption}>
              <img
                src={photo.src}
                alt={photo.caption}
                className="gallery-img"
                style={{
                  width: "100%",
                  height: "200px",
                  objectFit: "cover",
                  borderRadius: "8px",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="gallery-caption">{photo.caption}</div>
            </div>
          ))}
        </div>
        <p
          style={{
            color: "#888",
            fontSize: "0.85rem",
            marginTop: "1rem",
            textAlign: "center",
          }}
        >
          अधिक फोटो के लिए हमारे Facebook और Instagram पेज पर जाएं।
        </p>
      </div>
    );
  }

  function renderLocation() {
    return (
      <div className="section">
        <h2 className="section-title">
          <i className="fas fa-map-pin" /> हमारा स्थान
        </h2>
        <div className="grid-2" style={{ alignItems: "center" }}>
          <div className="address-block">
            <h3>🌿 Jeevika Didi Green Nursery</h3>
            <p>
              <i className="fas fa-map-marker-alt" /> <strong>पता:</strong>{" "}
              PAKADIYA, P.O- AJGARI MTH, P.S- BANJARIYA, EAST CHAMPARAN, BIHAR -
              845401
            </p>
            <p>
              <i className="fas fa-clock" /> <strong>खुलने का समय:</strong> सुबह
              8:00 – शाम 6:00
            </p>
            <a
              href="https://maps.app.goo.gl/KYFL9G7Pe5np7AGu9"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ marginTop: "0.5rem" }}
            >
              <i className="fab fa-google" /> गूगल मैप पर देखें
            </a>
          </div>
          <div className="map-container">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d28723.14333150442!2d84.798141!3d26.512234!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39936f1f0a0b1b7%3A0x9c5b3b3f3b3f3b3f!2sEast%20Champaran%2C%20Bihar%20845401!5e0!3m2!1sen!2sin!4v1700000000000"
              width="100%"
              height="350"
              style={{ border: 0, display: "block" }}
              allowFullScreen
              loading="lazy"
              title="Nursery Location Map"
            />
          </div>
        </div>
      </div>
    );
  }

  function renderContact() {
    return (
      <div className="section">
        <h2 className="section-title">
          <i className="fas fa-phone-alt" /> संपर्क करें
        </h2>
        <div className="grid-2">
          <div>
            <div className="contact-item">
              <i className="fas fa-phone" />
              <span>
                <strong>मोबाइल:</strong> 9504800073 | 8292480148
              </span>
            </div>
            <div className="contact-item">
              <i className="fab fa-whatsapp" style={{ color: "#25D366" }} />
              <span>
                <strong>WhatsApp:</strong>{" "}
                <a
                  href="https://wa.me/919504800073"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--primary)" }}
                >
                  9504800073
                </a>
              </span>
            </div>
            <div className="contact-item">
              <i className="fas fa-envelope" />
              <span>
                <strong>ईमेल:</strong> Jeevikadidigreennursery@gmail.com
              </span>
            </div>
            <div className="contact-item">
              <i className="fas fa-map-marker-alt" />
              <span>
                <strong>पता:</strong> PAKADIYA, EAST CHAMPARAN, BIHAR, 845401
              </span>
            </div>
            <div
              style={{
                marginTop: "1.25rem",
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <a
                href="https://wa.me/919504800073"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-wa"
              >
                <i className="fab fa-whatsapp" /> WhatsApp
              </a>
              <a
                href="tel:9504800073"
                className="btn"
                style={{ background: "var(--primary)" }}
              >
                <i className="fas fa-phone-alt" /> कॉल करें
              </a>
            </div>
            <div className="social-links">
              <a
                href="https://www.facebook.com/share/19uEQHNBYi/"
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon"
                data-ocid="contact.link"
              >
                <i className="fab fa-facebook-f" />
              </a>
              <a
                href="https://www.instagram.com/jeevikadidigreennursery"
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon"
                data-ocid="contact.link"
              >
                <i className="fab fa-instagram" />
              </a>
              <a
                href="https://wa.me/918292480148"
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon"
                data-ocid="contact.link"
              >
                <i className="fab fa-whatsapp" />
              </a>
            </div>
          </div>
          <div className="business-card">
            <i className="fas fa-store" />
            <h3>व्यापार प्रोफ़ाइल</h3>
            <p>
              <strong>Jeevika Didi Green Nursery</strong>
            </p>
            <p>East Champaran, Bihar – 845401</p>
            <p style={{ marginTop: "0.5rem" }}>
              <i
                className="fas fa-calendar-check"
                style={{ color: "var(--primary)", marginRight: "0.4rem" }}
              />
              स्थापना: 2022
            </p>
          </div>
        </div>
      </div>
    );
  }

  function renderLedger() {
    if (!isLoggedIn) return null;

    const amount = computeAmount(sbRate, sbQty);
    const pending = computePending(sbRate, sbQty, sbTransport, sbPaid);
    const panchayatOptions = PANCHAYAT_MAP[sbBlock] || [];

    let filtered = [...smartBills];
    if (filterBlock) filtered = filtered.filter((b) => b.block === filterBlock);
    if (filterPanchayat)
      filtered = filtered.filter((b) => b.panchayat === filterPanchayat);
    if (filterBillNo)
      filtered = filtered.filter((b) =>
        b.billNumber.toLowerCase().includes(filterBillNo.toLowerCase()),
      );
    if (filterMaterial)
      filtered = filtered.filter((b) =>
        b.material.toLowerCase().includes(filterMaterial.toLowerCase()),
      );
    if (filterYear)
      filtered = filtered.filter((b) => b.financialYear === filterYear);
    if (filterPayment === "paid")
      filtered = filtered.filter((b) => b.pending === 0);
    if (filterPayment === "partial")
      filtered = filtered.filter(
        (b) => b.pending > 0 && b.pending < b.amount + (b.transport || 0),
      );
    if (filterPayment === "pending")
      filtered = filtered.filter(
        (b) => b.pending === b.amount + (b.transport || 0),
      );

    const uniqueFilterBlocks = [
      ...new Set(smartBills.map((b) => b.block)),
    ].sort();
    const uniqueFilterPanchayats = filterBlock
      ? [
          ...new Set(
            smartBills
              .filter((b) => b.block === filterBlock)
              .map((b) => b.panchayat),
          ),
        ].sort()
      : [...new Set(smartBills.map((b) => b.panchayat))].sort();
    const uniqueYears = [
      ...new Set(smartBills.map((b) => b.financialYear)),
    ].sort();

    const fAmt = filtered.reduce((s, b) => s + b.amount, 0);
    const fTrans = filtered.reduce((s, b) => s + (b.transport || 0), 0);
    const fPaid = filtered.reduce((s, b) => s + (b.paid || 0), 0);
    const fPending = filtered.reduce((s, b) => s + (b.pending || 0), 0);
    const fGrand = fAmt + fTrans;

    function resetForm() {
      setSbBlock("");
      setSbPanchayat("");
      setSbBillNumber("");
      setSbMaterial("");
      setSbVendor("RUKMINA DEVI");
      setSbRate("");
      setSbQty("");
      setSbTransport("0");
      setSbPaid("0");
      setSbDate(today);
      setSbFinYear(globalFinancialYear);
      setEditingSmartBill(null);
    }

    function handleSaveBill(e: React.FormEvent) {
      e.preventDefault();
      if (
        !sbBlock ||
        !sbPanchayat ||
        !sbMaterial ||
        !sbRate ||
        !sbQty ||
        !sbDate
      ) {
        alert("सभी आवश्यक फील्ड भरें");
        return;
      }
      const rate = Number.parseFloat(sbRate);
      const qty = Number.parseFloat(sbQty);
      if (Number.isNaN(rate) || rate <= 0 || Number.isNaN(qty) || qty <= 0) {
        alert("दर और मात्रा सही भरें");
        return;
      }
      const amt = rate * qty;
      const trans = Number.parseFloat(sbTransport) || 0;
      const paid = Number.parseFloat(sbPaid) || 0;
      const pend = Math.max(0, amt + trans - paid);
      const billNo = sbBillNumber.trim() || generateBillNumber(smartBills);
      const newBill: SmartBill = {
        id: editingSmartBill?.id || Date.now(),
        billNumber: billNo,
        date: sbDate,
        state: "बिहार",
        district: "पूर्वी चंपारण",
        block: sbBlock,
        panchayat: sbPanchayat,
        material: sbMaterial,
        rate,
        quantity: qty,
        amount: amt,
        transport: trans,
        paid,
        pending: pend,
        vendor: sbVendor || "RUKMINA DEVI",
        financialYear: sbFinYear || globalFinancialYear,
      };
      let updated: SmartBill[];
      if (editingSmartBill) {
        updated = smartBills.map((b) =>
          b.id === editingSmartBill.id ? newBill : b,
        );
      } else {
        updated = [...smartBills, newBill];
      }
      saveBillsToStorage(updated);
      setSmartBills(updated);
      resetForm();
      alert(`✅ बिल सुरक्षित | बिल नं: ${billNo}`);
    }

    function handleEditBill(bill: SmartBill) {
      setEditingSmartBill(bill);
      setSbBlock(bill.block);
      setSbPanchayat(bill.panchayat);
      setSbBillNumber(bill.billNumber);
      setSbMaterial(bill.material);
      setSbVendor(bill.vendor);
      setSbRate(String(bill.rate));
      setSbQty(String(bill.quantity));
      setSbTransport(String(bill.transport || 0));
      setSbPaid(String(bill.paid || 0));
      setSbDate(bill.date);
      setSbFinYear(bill.financialYear);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleDeleteBill(id: number) {
      if (confirm("यह बिल हटाना है?")) {
        const updated = smartBills.filter((b) => b.id !== id);
        saveBillsToStorage(updated);
        setSmartBills(updated);
        if (editingSmartBill?.id === id) resetForm();
      }
    }

    function handlePrintFiltered() {
      if (!filtered.length) {
        alert("कोई बिल नहीं");
        return;
      }
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(
          generatePrintHTML(filtered, "फ़िल्टर रिपोर्ट", globalFinancialYear),
        );
        w.document.close();
        w.print();
      }
    }

    function handlePrintBlockPanchayat() {
      if (!filterBlock && !filterPanchayat) {
        alert("पहले ब्लॉक या पंचायत चुनें");
        return;
      }
      let toBePrinted = [...smartBills];
      let title = "";
      if (filterBlock && filterPanchayat) {
        toBePrinted = toBePrinted.filter(
          (b) => b.block === filterBlock && b.panchayat === filterPanchayat,
        );
        title = `ब्लॉक: ${filterBlock} | पंचायत: ${filterPanchayat}`;
      } else if (filterBlock) {
        toBePrinted = toBePrinted.filter((b) => b.block === filterBlock);
        title = `ब्लॉक: ${filterBlock}`;
      } else {
        toBePrinted = toBePrinted.filter(
          (b) => b.panchayat === filterPanchayat,
        );
        title = `पंचायत: ${filterPanchayat}`;
      }
      if (!toBePrinted.length) {
        alert("कोई बिल नहीं");
        return;
      }
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(
          generatePrintHTML(toBePrinted, title, globalFinancialYear),
        );
        w.document.close();
        w.print();
      }
    }

    return (
      <div className="section">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            🌱 जीविका दीदी ग्रीन नर्सरी — स्मार्ट बिलिंग सिस्टम
          </h2>
          <button
            type="button"
            className="btn-logout"
            onClick={handleLogout}
            data-ocid="ledger.close_button"
          >
            <i className="fas fa-sign-out-alt" /> लॉगआउट
          </button>
        </div>

        <div
          style={{
            background: "#fef9e3",
            color: "#2c5a2e",
            padding: "10px 16px",
            borderRadius: "16px",
            marginBottom: "1.5rem",
            fontSize: "0.8rem",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <span>🌿 जीविका दीदी ग्रीन नर्सरी, प्लांटेशन-गेबियन (बांस गेबियन)</span>
          <span>📍 पकरिया, अजगरी, बंजरिया, पूर्वी चंपारण, 845401</span>
          <span>📞 8292480148, 9504800073</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#f0f7ed",
              padding: "2px 10px",
              borderRadius: "40px",
            }}
          >
            📅 {globalFinancialYear}
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: "#2b8c4a",
                fontSize: "0.75rem",
              }}
              onClick={() => {
                const ny = prompt(
                  "वित्तीय वर्ष बदलें (उदा: 2025-2026):",
                  globalFinancialYear,
                );
                if (ny?.trim()) setGlobalFinancialYear(ny.trim());
              }}
            >
              <i className="fas fa-pencil-alt" />
            </button>
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <div className="ledger-form-card">
            <h2>{editingSmartBill ? "✏️ बिल संपादित करें" : "🧾 नया बिल जोड़ें"}</h2>
            <form onSubmit={handleSaveBill}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sb-state">राज्य</label>
                  <input
                    id="sb-state"
                    type="text"
                    className="form-input"
                    value="बिहार"
                    readOnly
                    style={{ background: "#f0f3ec" }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sb-district">जिला</label>
                  <input
                    id="sb-district"
                    type="text"
                    className="form-input"
                    value="पूर्वी चंपारण"
                    readOnly
                    style={{ background: "#f0f3ec" }}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sb-block">ब्लॉक *</label>
                  <select
                    id="sb-block"
                    className="form-input"
                    value={sbBlock}
                    required
                    onChange={(e) => {
                      setSbBlock(e.target.value);
                      setSbPanchayat("");
                    }}
                    data-ocid="ledger.block.select"
                  >
                    <option value="">-- ब्लॉक चुनें --</option>
                    {ALL_BLOCKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="sb-panchayat">पंचायत *</label>
                  <select
                    id="sb-panchayat"
                    className="form-input"
                    value={sbPanchayat}
                    required
                    onChange={(e) => setSbPanchayat(e.target.value)}
                    data-ocid="ledger.panchayat.select"
                  >
                    <option value="">-- पंचायत चुनें --</option>
                    {panchayatOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    {panchayatOptions.length === 0 && sbBlock && (
                      <option value="ग्राम पंचायत 1">ग्राम पंचायत 1</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="sb-billno">
                  बिल नंबर (खाली छोड़ें तो अपने आप बनेगा)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="अपने आप जनरेट होगा"
                  value={sbBillNumber}
                  onChange={(e) => setSbBillNumber(e.target.value)}
                  id="sb-billno"
                  data-ocid="ledger.billno.input"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sb-material">सामग्री *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="जैसे: पौधा, बांस गेबियन"
                    required
                    value={sbMaterial}
                    onChange={(e) => setSbMaterial(e.target.value)}
                    id="sb-material"
                    data-ocid="ledger.material.input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sb-vendor">विक्रेता</label>
                  <input
                    type="text"
                    className="form-input"
                    value={sbVendor}
                    onChange={(e) => setSbVendor(e.target.value)}
                    id="sb-vendor"
                    data-ocid="ledger.vendor.input"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sb-rate">दर (₹) *</label>
                  <input
                    type="number"
                    className="form-input"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={sbRate}
                    onChange={(e) => setSbRate(e.target.value)}
                    id="sb-rate"
                    data-ocid="ledger.rate.input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sb-qty">मात्रा *</label>
                  <input
                    type="number"
                    className="form-input"
                    step="any"
                    required
                    placeholder="0"
                    value={sbQty}
                    onChange={(e) => setSbQty(e.target.value)}
                    id="sb-qty"
                    data-ocid="ledger.qty.input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="sb-amount">राशि (Auto)</label>
                <input
                  type="text"
                  className="form-input"
                  readOnly
                  value={amount.toFixed(2)}
                  style={{ background: "#e9f3e6", fontWeight: "bold" }}
                />
              </div>
              <div
                style={{
                  background: "#fff9f0",
                  padding: "12px",
                  borderRadius: "12px",
                  marginBottom: "10px",
                  borderLeft: "4px solid #e67e22",
                }}
              >
                <label
                  htmlFor="sb-transport"
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: 600,
                    color: "#c0531a",
                    fontSize: "0.85rem",
                  }}
                >
                  🚚 गाड़ी भाड़ा (Transport Charge) ₹
                </label>
                <input
                  id="sb-transport"
                  type="number"
                  className="form-input"
                  step="0.01"
                  placeholder="0.00"
                  value={sbTransport}
                  onChange={(e) => setSbTransport(e.target.value)}
                  data-ocid="ledger.transport.input"
                />
                <small style={{ color: "#e67e22", fontSize: "0.75rem" }}>
                  यह राशि अलग से जुड़ेगी
                </small>
              </div>
              <div
                style={{
                  background: "#f0f7ff",
                  padding: "12px",
                  borderRadius: "12px",
                  marginBottom: "10px",
                  borderLeft: "4px solid #2196f3",
                }}
              >
                <div
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: 600,
                    color: "#1565c0",
                    fontSize: "0.85rem",
                  }}
                >
                  💰 भुगतान स्थिति
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="sb-paid">प्राप्त राशि (Paid) ₹</label>
                    <input
                      type="number"
                      className="form-input"
                      step="0.01"
                      placeholder="0.00"
                      value={sbPaid}
                      onChange={(e) => setSbPaid(e.target.value)}
                      data-ocid="ledger.paid.input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="sb-pending">बकाया राशि (Pending) ₹</label>
                    <input
                      type="text"
                      className="form-input"
                      readOnly
                      value={pending.toFixed(2)}
                      style={{ background: "#fff0e0", fontWeight: "bold" }}
                    />
                  </div>
                </div>
                <small style={{ color: "#2196f3", fontSize: "0.75rem" }}>
                  प्राप्त राशि डालें, बकाया अपने आप कैलकुलेट होगा
                </small>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sb-date">तिथि *</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    value={sbDate}
                    onChange={(e) => setSbDate(e.target.value)}
                    id="sb-date"
                    data-ocid="ledger.date.input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sb-finyear">वित्तीय वर्ष</label>
                  <input
                    type="text"
                    className="form-input"
                    value={sbFinYear}
                    onChange={(e) => setSbFinYear(e.target.value)}
                    id="sb-finyear"
                    data-ocid="ledger.finyear.input"
                  />
                </div>
              </div>
              <div
                style={{
                  background: "#eef5ea",
                  padding: "10px",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  textAlign: "center",
                  margin: "10px 0",
                  fontSize: "0.9rem",
                }}
              >
                💰 कुल राशि (बिना गाड़ी): ₹ {amount.toFixed(2)}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "10px",
                }}
              >
                <button
                  type="submit"
                  className="btn"
                  style={{ flex: 1 }}
                  data-ocid="ledger.submit_button"
                >
                  💾 बिल सेव करें
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={resetForm}
                  data-ocid="ledger.secondary_button"
                >
                  🔄 नया / साफ
                </button>
              </div>
            </form>
          </div>

          <div className="ledger-form-card">
            <h2>🔍 खोजें &amp; फ़िल्टर</h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <div className="form-row">
                <select
                  className="form-input"
                  value={filterBlock}
                  onChange={(e) => {
                    setFilterBlock(e.target.value);
                    setFilterPanchayat("");
                  }}
                  data-ocid="ledger.block.select"
                >
                  <option value="">सभी ब्लॉक</option>
                  {uniqueFilterBlocks.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <select
                  className="form-input"
                  value={filterPanchayat}
                  onChange={(e) => setFilterPanchayat(e.target.value)}
                  data-ocid="ledger.panchayat.select"
                >
                  <option value="">सभी पंचायत</option>
                  {uniqueFilterPanchayats.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="बिल नंबर से खोजें"
                  value={filterBillNo}
                  onChange={(e) => setFilterBillNo(e.target.value)}
                  data-ocid="ledger.search_input"
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="सामग्री से खोजें"
                  value={filterMaterial}
                  onChange={(e) => setFilterMaterial(e.target.value)}
                  data-ocid="ledger.search_input"
                />
              </div>
              <div className="form-row">
                <select
                  className="form-input"
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                  data-ocid="ledger.payment.select"
                >
                  <option value="">सभी भुगतान स्थिति</option>
                  <option value="paid">पूर्ण भुगतान (Paid)</option>
                  <option value="partial">आंशिक भुगतान (Partial)</option>
                  <option value="pending">बकाया (Pending)</option>
                </select>
                <select
                  className="form-input"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  data-ocid="ledger.year.select"
                >
                  <option value="">सभी वित्त वर्ष</option>
                  {uniqueYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setFilterBlock("");
                  setFilterPanchayat("");
                  setFilterBillNo("");
                  setFilterMaterial("");
                  setFilterYear("");
                  setFilterPayment("");
                }}
                data-ocid="ledger.secondary_button"
              >
                रीसेट फ़िल्टर
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handlePrintFiltered}
                data-ocid="ledger.primary_button"
              >
                🖨️ फ़िल्टर प्रिंट
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handlePrintBlockPanchayat}
                data-ocid="ledger.primary_button"
              >
                📑 ब्लॉक/पंचायत प्रिंट
              </button>
            </div>
          </div>
        </div>

        <div className="ledger-form-card">
          <h2>📋 सभी बिल रिकॉर्ड्स</h2>
          <div style={{ overflowX: "auto" }}>
            <table
              className="ledger-table"
              style={{ minWidth: "1100px" }}
              data-ocid="ledger.table"
            >
              <thead>
                <tr>
                  <th>बिल नंबर</th>
                  <th>तिथि</th>
                  <th>ब्लॉक</th>
                  <th>पंचायत</th>
                  <th>सामग्री</th>
                  <th>दर(₹)</th>
                  <th>मात्रा</th>
                  <th>राशि(₹)</th>
                  <th>गाड़ी(₹)</th>
                  <th>कुल(₹)</th>
                  <th>प्राप्त(₹)</th>
                  <th>बकाया(₹)</th>
                  <th>स्थिति</th>
                  <th>विक्रेता</th>
                  <th>वित्त वर्ष</th>
                  <th>कार्रवाई</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={16}
                      style={{
                        textAlign: "center",
                        color: "#888",
                        padding: "20px",
                      }}
                      data-ocid="ledger.empty_state"
                    >
                      कोई बिल नहीं
                    </td>
                  </tr>
                ) : (
                  filtered.map((b, idx) => {
                    const total = b.amount + (b.transport || 0);
                    const status = getPaymentStatus(b);
                    return (
                      <tr key={b.id} data-ocid={`ledger.item.${idx + 1}`}>
                        <td>
                          <span
                            style={{
                              background: "#2b8c4a20",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "0.7rem",
                              fontWeight: "bold",
                              color: "#1e6a3a",
                            }}
                          >
                            {b.billNumber}
                          </span>
                        </td>
                        <td>{b.date}</td>
                        <td>{b.block}</td>
                        <td>{b.panchayat}</td>
                        <td>{b.material}</td>
                        <td>₹{b.rate}</td>
                        <td>{b.quantity}</td>
                        <td>₹{b.amount.toFixed(2)}</td>
                        <td>₹{(b.transport || 0).toFixed(2)}</td>
                        <td>₹{total.toFixed(2)}</td>
                        <td>₹{(b.paid || 0).toFixed(2)}</td>
                        <td>₹{(b.pending || 0).toFixed(2)}</td>
                        <td>
                          <span
                            style={{
                              background: status.isPaid ? "#4caf50" : "#ff9800",
                              color: "white",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "0.7rem",
                            }}
                          >
                            {status.text}
                          </span>
                        </td>
                        <td>{b.vendor}</td>
                        <td>{b.financialYear}</td>
                        <td>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              type="button"
                              className="icon-btn edit"
                              onClick={() => handleEditBill(b)}
                              title="संपादित करें"
                              data-ocid={`ledger.edit_button.${idx + 1}`}
                            >
                              <i className="fas fa-edit" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() => handleDeleteBill(b.id)}
                              title="हटाएं"
                              data-ocid={`ledger.delete_button.${idx + 1}`}
                            >
                              <i className="fas fa-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "10px",
              marginTop: "15px",
            }}
          >
            <div
              style={{
                background: "#1e3a2f",
                color: "white",
                padding: "12px",
                borderRadius: "14px",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "0.85rem",
              }}
            >
              💰 बिल: ₹{fAmt.toFixed(2)} | सभी: ₹
              {smartBills.reduce((s, b) => s + b.amount, 0).toFixed(2)}
            </div>
            <div
              style={{
                background: "#e67e22",
                color: "white",
                padding: "12px",
                borderRadius: "14px",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "0.85rem",
              }}
            >
              🚚 गाड़ी: ₹{fTrans.toFixed(2)} | सभी: ₹
              {smartBills
                .reduce((s, b) => s + (b.transport || 0), 0)
                .toFixed(2)}
            </div>
            <div
              style={{
                background: "#2196f3",
                color: "white",
                padding: "12px",
                borderRadius: "14px",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "0.85rem",
              }}
            >
              💵 प्राप्त: ₹{fPaid.toFixed(2)} | सभी: ₹
              {smartBills.reduce((s, b) => s + (b.paid || 0), 0).toFixed(2)}
            </div>
            <div
              style={{
                background: "#ff9800",
                color: "white",
                padding: "12px",
                borderRadius: "14px",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "0.85rem",
              }}
            >
              ⏳ बकाया: ₹{fPending.toFixed(2)} | सभी: ₹
              {smartBills.reduce((s, b) => s + (b.pending || 0), 0).toFixed(2)}
            </div>
            <div
              style={{
                background: "#2b8c4a",
                color: "white",
                padding: "12px",
                borderRadius: "14px",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "0.85rem",
              }}
            >
              🌟 योग: ₹{fGrand.toFixed(2)} | सभी: ₹
              {smartBills
                .reduce((s, b) => s + b.amount + (b.transport || 0), 0)
                .toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderKhataBahi() {
    if (!isKhataLoggedIn) return null;

    const kbAmount =
      (Number.parseFloat(kbRate) || 0) * (Number.parseFloat(kbQty) || 0);
    const kbPending = Math.max(0, kbAmount - (Number.parseFloat(kbPaid) || 0));
    const kbPanchayatOptions = PANCHAYAT_MAP[kbBlock] || [];

    let kbFiltered = [...khataEntries];
    if (kbSearchCustomer)
      kbFiltered = kbFiltered.filter((e) =>
        e.customerName.toLowerCase().includes(kbSearchCustomer.toLowerCase()),
      );
    if (kbFilterBlock)
      kbFiltered = kbFiltered.filter((e) => e.block === kbFilterBlock);
    if (kbFilterPanchayat)
      kbFiltered = kbFiltered.filter((e) => e.panchayat === kbFilterPanchayat);

    const kbUniqueBlocks = [
      ...new Set(khataEntries.map((e) => e.block)),
    ].sort();
    const kbUniquePanchayats = kbFilterBlock
      ? [
          ...new Set(
            khataEntries
              .filter((e) => e.block === kbFilterBlock)
              .map((e) => e.panchayat),
          ),
        ].sort()
      : [...new Set(khataEntries.map((e) => e.panchayat))].sort();

    const kbTotalAmt = kbFiltered.reduce((s, e) => s + e.amount, 0);
    const kbTotalPaid = kbFiltered.reduce((s, e) => s + e.paid, 0);
    const kbTotalPending = kbFiltered.reduce((s, e) => s + e.pending, 0);

    function resetKbForm() {
      setKbCustomer("");
      setKbBlock("");
      setKbPanchayat("");
      setKbMaterial("");
      setKbQty("");
      setKbRate("");
      setKbDate(today);
      setKbPaid("0");
      setKbBillNo("");
      setKbRemarks("");
      setEditingKhata(null);
    }

    function handleKbSave(e: React.FormEvent) {
      e.preventDefault();
      if (
        !kbCustomer ||
        !kbBlock ||
        !kbPanchayat ||
        !kbMaterial ||
        !kbQty ||
        !kbRate ||
        !kbDate
      ) {
        alert("सभी आवश्यक फील्ड भरें");
        return;
      }
      const rate = Number.parseFloat(kbRate);
      const qty = Number.parseFloat(kbQty);
      if (Number.isNaN(rate) || rate <= 0 || Number.isNaN(qty) || qty <= 0) {
        alert("दर और मात्रा सही भरें");
        return;
      }
      const amt = rate * qty;
      const paid = Number.parseFloat(kbPaid) || 0;
      const pend = Math.max(0, amt - paid);
      const billNo = kbBillNo.trim() || generateKhataNumber(khataEntries);
      const entry: KhataEntry = {
        id: editingKhata?.id || Date.now(),
        billNumber: billNo,
        date: kbDate,
        customerName: kbCustomer,
        block: kbBlock,
        panchayat: kbPanchayat,
        material: kbMaterial,
        quantity: qty,
        rate,
        amount: amt,
        paid,
        pending: pend,
        remarks: kbRemarks,
      };
      let updated: KhataEntry[];
      if (editingKhata) {
        updated = khataEntries.map((e) =>
          e.id === editingKhata.id ? entry : e,
        );
      } else {
        updated = [...khataEntries, entry];
      }
      saveKhataToStorage(updated);
      setKhataEntries(updated);
      resetKbForm();
      alert(`✅ एंट्री सुरक्षित | बिल नं: ${billNo}`);
    }

    function handleKbEdit(entry: KhataEntry) {
      setEditingKhata(entry);
      setKbCustomer(entry.customerName);
      setKbBlock(entry.block);
      setKbPanchayat(entry.panchayat);
      setKbMaterial(entry.material);
      setKbQty(String(entry.quantity));
      setKbRate(String(entry.rate));
      setKbDate(entry.date);
      setKbPaid(String(entry.paid));
      setKbBillNo(entry.billNumber);
      setKbRemarks(entry.remarks);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleKbDelete(id: number) {
      if (confirm("यह एंट्री हटाना है?")) {
        const updated = khataEntries.filter((e) => e.id !== id);
        saveKhataToStorage(updated);
        setKhataEntries(updated);
        if (editingKhata?.id === id) resetKbForm();
      }
    }

    function handleKbPrint() {
      if (!kbFiltered.length) {
        alert("कोई एंट्री नहीं");
        return;
      }
      const rows = kbFiltered
        .map(
          (e, i) =>
            `<tr><td>${i + 1}</td><td>${e.billNumber}</td><td>${e.date}</td><td>${e.customerName}</td><td>${e.block}</td><td>${e.panchayat}</td><td>${e.material}</td><td>${e.quantity}</td><td>₹${e.rate}</td><td>₹${e.amount.toFixed(2)}</td><td>₹${e.paid.toFixed(2)}</td><td>₹${e.pending.toFixed(2)}</td><td>${e.remarks}</td></tr>`,
        )
        .join("");
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>खाता बही</title><style>body{font-family:Arial;margin:20px;}.h{text-align:center;border-bottom:2px solid #2b8c4a;margin-bottom:20px;}table{border-collapse:collapse;width:100%;font-size:9px;}th,td{border:1px solid #000;padding:4px;}</style></head><body><div class="h"><h2>📒 खाता बही — जीविका दीदी ग्रीन नर्सरी</h2><p>पता: पकरिया, अजगरी, बंजरिया, पूर्वी चंपारण | मोबाइल: 8292480148, 9504800073</p><p>कुल एंट्री: ${kbFiltered.length} | तिथि: ${new Date().toLocaleString()}</p></div><table><thead><tr><th>क्र.</th><th>बिल नं.</th><th>तिथि</th><th>ग्राहक</th><th>ब्लॉक</th><th>पंचायत</th><th>सामग्री</th><th>मात्रा</th><th>दर</th><th>राशि</th><th>प्राप्त</th><th>बकाया</th><th>टिप्पणी</th></tr></thead><tbody>${rows}<tr style="font-weight:bold"><td colspan="9" align="right">कुल योग</td><td>₹${kbTotalAmt.toFixed(2)}</td><td>₹${kbTotalPaid.toFixed(2)}</td><td>₹${kbTotalPending.toFixed(2)}</td><td></td></tr></tbody></table><p>हस्ताक्षर: ___________ &nbsp; दिनांक: ${new Date().toLocaleDateString()}</p></body></html>`;
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
        w.print();
      }
    }

    return (
      <div className="section">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            📒 खाता बही — जीविका दीदी ग्रीन नर्सरी
          </h2>
          <button
            type="button"
            className="btn-logout"
            onClick={handleKhataLogout}
            data-ocid="khataBahi.close_button"
          >
            <i className="fas fa-sign-out-alt" /> लॉगआउट
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <div className="ledger-form-card">
            <h2>{editingKhata ? "✏️ एंट्री संपादित करें" : "📝 नई एंट्री जोड़ें"}</h2>
            <form onSubmit={handleKbSave}>
              <div className="form-group">
                <label htmlFor="kb-customer">ग्राहक का नाम *</label>
                <input
                  id="kb-customer"
                  type="text"
                  className="form-input"
                  placeholder="ग्राहक का नाम"
                  required
                  value={kbCustomer}
                  onChange={(e) => setKbCustomer(e.target.value)}
                  data-ocid="khataBahi.input"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="kb-block">ब्लॉक *</label>
                  <select
                    id="kb-block"
                    className="form-input"
                    value={kbBlock}
                    required
                    onChange={(e) => {
                      setKbBlock(e.target.value);
                      setKbPanchayat("");
                    }}
                    data-ocid="khataBahi.block.select"
                  >
                    <option value="">-- ब्लॉक चुनें --</option>
                    {ALL_BLOCKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="kb-panchayat">पंचायत *</label>
                  <select
                    id="kb-panchayat"
                    className="form-input"
                    value={kbPanchayat}
                    required
                    onChange={(e) => setKbPanchayat(e.target.value)}
                    data-ocid="khataBahi.panchayat.select"
                  >
                    <option value="">-- पंचायत चुनें --</option>
                    {kbPanchayatOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    {kbPanchayatOptions.length === 0 && kbBlock && (
                      <option value="ग्राम पंचायत 1">ग्राम पंचायत 1</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="kb-billno">बिल नंबर (खाली छोड़ें)</label>
                <input
                  id="kb-billno"
                  type="text"
                  className="form-input"
                  placeholder="अपने आप जनरेट होगा"
                  value={kbBillNo}
                  onChange={(e) => setKbBillNo(e.target.value)}
                  data-ocid="khataBahi.input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="kb-material">सामग्री *</label>
                <input
                  id="kb-material"
                  type="text"
                  className="form-input"
                  placeholder="जैसे: पौधा, बांस गेबियन"
                  required
                  value={kbMaterial}
                  onChange={(e) => setKbMaterial(e.target.value)}
                  data-ocid="khataBahi.input"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="kb-qty">मात्रा *</label>
                  <input
                    id="kb-qty"
                    type="number"
                    className="form-input"
                    step="any"
                    required
                    placeholder="0"
                    value={kbQty}
                    onChange={(e) => setKbQty(e.target.value)}
                    data-ocid="khataBahi.input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="kb-rate">दर (₹) *</label>
                  <input
                    id="kb-rate"
                    type="number"
                    className="form-input"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={kbRate}
                    onChange={(e) => setKbRate(e.target.value)}
                    data-ocid="khataBahi.input"
                  />
                </div>
              </div>
              <div
                style={{
                  background: "#eef5ea",
                  padding: "10px",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  textAlign: "center",
                  margin: "8px 0",
                  fontSize: "0.9rem",
                }}
              >
                💰 राशि: ₹{kbAmount.toFixed(2)} | बकाया: ₹{kbPending.toFixed(2)}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="kb-date">तिथि *</label>
                  <input
                    id="kb-date"
                    type="date"
                    className="form-input"
                    required
                    value={kbDate}
                    onChange={(e) => setKbDate(e.target.value)}
                    data-ocid="khataBahi.input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="kb-paid">भुगतान प्राप्त (₹)</label>
                  <input
                    id="kb-paid"
                    type="number"
                    className="form-input"
                    step="0.01"
                    placeholder="0.00"
                    value={kbPaid}
                    onChange={(e) => setKbPaid(e.target.value)}
                    data-ocid="khataBahi.input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="kb-remarks">टिप्पणी</label>
                <input
                  id="kb-remarks"
                  type="text"
                  className="form-input"
                  placeholder="कोई नोट..."
                  value={kbRemarks}
                  onChange={(e) => setKbRemarks(e.target.value)}
                  data-ocid="khataBahi.input"
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "10px",
                }}
              >
                <button
                  type="submit"
                  className="btn"
                  style={{ flex: 1 }}
                  data-ocid="khataBahi.submit_button"
                >
                  💾 सेव करें
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={resetKbForm}
                  data-ocid="khataBahi.secondary_button"
                >
                  🔄 नया / साफ
                </button>
              </div>
            </form>
          </div>

          <div className="ledger-form-card">
            <h2>🔍 खोजें &amp; फ़िल्टर</h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <input
                type="text"
                className="form-input"
                placeholder="ग्राहक नाम से खोजें"
                value={kbSearchCustomer}
                onChange={(e) => setKbSearchCustomer(e.target.value)}
                data-ocid="khataBahi.search_input"
              />
              <div className="form-row">
                <select
                  className="form-input"
                  value={kbFilterBlock}
                  onChange={(e) => {
                    setKbFilterBlock(e.target.value);
                    setKbFilterPanchayat("");
                  }}
                  data-ocid="khataBahi.block.select"
                >
                  <option value="">सभी ब्लॉक</option>
                  {kbUniqueBlocks.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <select
                  className="form-input"
                  value={kbFilterPanchayat}
                  onChange={(e) => setKbFilterPanchayat(e.target.value)}
                  data-ocid="khataBahi.panchayat.select"
                >
                  <option value="">सभी पंचायत</option>
                  {kbUniquePanchayats.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setKbSearchCustomer("");
                  setKbFilterBlock("");
                  setKbFilterPanchayat("");
                }}
                data-ocid="khataBahi.secondary_button"
              >
                रीसेट फ़िल्टर
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleKbPrint}
                data-ocid="khataBahi.primary_button"
              >
                🖨️ प्रिंट करें
              </button>
            </div>
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                background: "#f9fff7",
                borderRadius: "12px",
                border: "1px solid #e0e7e0",
              }}
            >
              <p
                style={{
                  fontWeight: "bold",
                  color: "#1b4d2b",
                  marginBottom: "0.5rem",
                }}
              >
                📊 कुल सारांश (फ़िल्टर के अनुसार)
              </p>
              <p>
                💰 कुल राशि: <strong>₹{kbTotalAmt.toFixed(2)}</strong>
              </p>
              <p>
                💵 कुल प्राप्त: <strong>₹{kbTotalPaid.toFixed(2)}</strong>
              </p>
              <p>
                ⏳ कुल बकाया: <strong>₹{kbTotalPending.toFixed(2)}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="ledger-form-card">
          <h2>📋 सभी एंट्री रिकॉर्ड्स ({kbFiltered.length})</h2>
          <div style={{ overflowX: "auto" }}>
            <table
              className="ledger-table"
              style={{ minWidth: "900px" }}
              data-ocid="khataBahi.table"
            >
              <thead>
                <tr>
                  <th>बिल नंबर</th>
                  <th>तिथि</th>
                  <th>ग्राहक</th>
                  <th>ब्लॉक</th>
                  <th>पंचायत</th>
                  <th>सामग्री</th>
                  <th>मात्रा</th>
                  <th>दर(₹)</th>
                  <th>राशि(₹)</th>
                  <th>प्राप्त(₹)</th>
                  <th>बकाया(₹)</th>
                  <th>स्थिति</th>
                  <th>टिप्पणी</th>
                  <th>कार्रवाई</th>
                </tr>
              </thead>
              <tbody>
                {kbFiltered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={14}
                      style={{
                        textAlign: "center",
                        color: "#888",
                        padding: "20px",
                      }}
                      data-ocid="khataBahi.empty_state"
                    >
                      कोई एंट्री नहीं
                    </td>
                  </tr>
                ) : (
                  kbFiltered.map((e, idx) => (
                    <tr key={e.id} data-ocid={`khataBahi.item.${idx + 1}`}>
                      <td>
                        <span
                          style={{
                            background: "#2b8c4a20",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            color: "#1e6a3a",
                          }}
                        >
                          {e.billNumber}
                        </span>
                      </td>
                      <td>{e.date}</td>
                      <td>
                        <strong>{e.customerName}</strong>
                      </td>
                      <td>{e.block}</td>
                      <td>{e.panchayat}</td>
                      <td>{e.material}</td>
                      <td>{e.quantity}</td>
                      <td>₹{e.rate}</td>
                      <td>₹{e.amount.toFixed(2)}</td>
                      <td>₹{e.paid.toFixed(2)}</td>
                      <td>₹{e.pending.toFixed(2)}</td>
                      <td>
                        <span
                          style={{
                            background: e.pending === 0 ? "#4caf50" : "#ff9800",
                            color: "white",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.7rem",
                          }}
                        >
                          {e.pending === 0
                            ? "पूर्ण भुगतान"
                            : e.paid > 0
                              ? "आंशिक"
                              : "बकाया"}
                        </span>
                      </td>
                      <td>{e.remarks}</td>
                      <td>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            type="button"
                            className="icon-btn edit"
                            onClick={() => handleKbEdit(e)}
                            title="संपादित करें"
                            data-ocid={`khataBahi.edit_button.${idx + 1}`}
                          >
                            <i className="fas fa-edit" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => handleKbDelete(e.id)}
                            title="हटाएं"
                            data-ocid={`khataBahi.delete_button.${idx + 1}`}
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "10px",
              marginTop: "15px",
            }}
          >
            <div
              style={{
                background: "#1e3a2f",
                color: "white",
                padding: "12px",
                borderRadius: "14px",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "0.85rem",
              }}
            >
              💰 राशि: ₹{kbTotalAmt.toFixed(2)} | सभी: ₹
              {khataEntries.reduce((s, e) => s + e.amount, 0).toFixed(2)}
            </div>
            <div
              style={{
                background: "#2196f3",
                color: "white",
                padding: "12px",
                borderRadius: "14px",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "0.85rem",
              }}
            >
              💵 प्राप्त: ₹{kbTotalPaid.toFixed(2)} | सभी: ₹
              {khataEntries.reduce((s, e) => s + e.paid, 0).toFixed(2)}
            </div>
            <div
              style={{
                background: "#ff9800",
                color: "white",
                padding: "12px",
                borderRadius: "14px",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "0.85rem",
              }}
            >
              ⏳ बकाया: ₹{kbTotalPending.toFixed(2)} | सभी: ₹
              {khataEntries.reduce((s, e) => s + e.pending, 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "home", label: "होम" },
    { id: "plants", label: "पौधे" },
    { id: "training", label: "ट्रेनिंग" },
    { id: "certificate", label: "सर्टिफिकेट" },
    { id: "gallery", label: "गैलरी" },
    { id: "location", label: "लोकेशन" },
    { id: "contact", label: "संपर्क" },
    { id: "khataBahi", label: "📒 खाता बही" },
    { id: "ledger", label: "🧾 स्मार्ट बिलिंग" },
  ];

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Navbar */}
      <nav className="navbar">
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: "60px",
          }}
        >
          <button
            type="button"
            className="nav-brand"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            onClick={() => navigate("home")}
            data-ocid="nav.link"
          >
            🌿 जीविका दीदी ग्रीन नर्सरी
          </button>

          {/* Desktop nav */}
          <div
            className="nav-menu"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              flexWrap: "wrap",
            }}
          >
            {navItems.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`nav-link ${activeSection === item.id ? "active" : ""}`}
                onClick={() => navigate(item.id)}
                data-ocid={`nav.${item.id}.link`}
              >
                {item.label}
              </button>
            ))}
            {isLoggedIn && activeSection === "ledger" && (
              <button
                type="button"
                className="btn-logout"
                onClick={handleLogout}
                data-ocid="nav.logout.button"
              >
                लॉगआउट
              </button>
            )}
            {isKhataLoggedIn && activeSection === "khataBahi" && (
              <button
                type="button"
                className="btn-logout"
                onClick={handleKhataLogout}
                data-ocid="nav.khata-logout.button"
              >
                लॉगआउट
              </button>
            )}
          </div>

          {/* Hamburger */}
          <button
            type="button"
            className="hamburger"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="मेनू"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`nav-menu ${menuOpen ? "open" : ""}`}
          style={menuOpen ? {} : { display: "none" }}
        >
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`nav-link ${activeSection === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}
              data-ocid={`nav.mobile.${item.id}.link`}
            >
              {item.label}
            </button>
          ))}
          {isLoggedIn && activeSection === "ledger" && (
            <button
              type="button"
              className="btn-logout"
              onClick={handleLogout}
              style={{ alignSelf: "flex-start" }}
              data-ocid="nav.mobile.logout.button"
            >
              लॉगआउट
            </button>
          )}
          {isKhataLoggedIn && activeSection === "khataBahi" && (
            <button
              type="button"
              className="btn-logout"
              onClick={handleKhataLogout}
              style={{ alignSelf: "flex-start" }}
              data-ocid="nav.mobile.khata-logout.button"
            >
              लॉगआउट
            </button>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1 }}>
        {activeSection === "home" && renderHome()}
        {activeSection === "plants" && renderPlants()}
        {activeSection === "training" && renderTraining()}
        {activeSection === "certificate" && renderCertificate()}
        {activeSection === "gallery" && renderGallery()}
        {activeSection === "location" && renderLocation()}
        {activeSection === "contact" && renderContact()}
        {activeSection === "ledger" && renderLedger()}
        {activeSection === "khataBahi" && renderKhataBahi()}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>
          © 2022-{new Date().getFullYear()} Jeevika Didi Green Nursery | पूर्वी
          चंपारण, बिहार
        </p>
        <p>🌱 पौधारोपण करें, पर्यावरण बचाएं 🌱</p>
        <p style={{ marginTop: "0.4rem", fontSize: "0.8rem", opacity: 0.7 }}>
          Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--secondary)" }}
          >
            caffeine.ai
          </a>
        </p>
      </footer>

      {/* Scroll top */}
      <button
        type="button"
        className={`scroll-top ${scrollVisible ? "visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        title="ऊपर जाएं"
        data-ocid="nav.button"
      >
        <i className="fas fa-arrow-up" />
      </button>

      {/* Khata Bahi Login Modal */}
      {showKhataModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowKhataModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowKhataModal(false);
          }}
          role="presentation"
          data-ocid="khataBahi.modal"
        >
          <div className="modal-content">
            <div className="modal-title">
              <i className="fas fa-lock" /> 📒 खाता बही — लॉगिन
            </div>
            <div className="form-group" style={{ marginBottom: "0.75rem" }}>
              <label htmlFor="khata-username">यूजरनेम</label>
              <input
                id="khata-username"
                type="text"
                className="form-input"
                placeholder="यूजरनेम डालें"
                value={khataUser}
                onChange={(e) => setKhataUser(e.target.value)}
                autoComplete="username"
                data-ocid="khataBahi.input"
              />
            </div>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label htmlFor="khata-password">पासवर्ड</label>
              <input
                id="khata-password"
                type="password"
                className="form-input"
                placeholder="पासवर्ड डालें"
                value={khataPwd}
                onChange={(e) => setKhataPwd(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleKhataLogin();
                }}
                autoComplete="current-password"
                data-ocid="khataBahi.input"
              />
            </div>
            {khataError && (
              <div className="error-msg" data-ocid="khataBahi.error_state">
                {khataError}
              </div>
            )}
            <div
              style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}
            >
              <button
                type="button"
                className="btn"
                style={{ flex: 1 }}
                onClick={handleKhataLogin}
                data-ocid="khataBahi.submit_button"
              >
                <i className="fas fa-sign-in-alt" /> लॉगिन करें
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowKhataModal(false);
                  setKhataError("");
                }}
                data-ocid="khataBahi.cancel_button"
              >
                रद्द करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLoginModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowLoginModal(false);
          }}
          role="presentation"
          data-ocid="login.modal"
        >
          <div className="modal-content">
            <div className="modal-title">
              <i className="fas fa-lock" /> खाता बही में प्रवेश करें
            </div>
            <div className="form-group" style={{ marginBottom: "0.75rem" }}>
              <label htmlFor="login-username">यूजरनेम</label>
              <input
                id="login-username"
                type="text"
                className="form-input"
                placeholder="यूजरनेम डालें"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                autoComplete="username"
                data-ocid="login.input"
              />
            </div>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label htmlFor="login-password">पासवर्ड</label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="पासवर्ड डालें"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogin();
                }}
                autoComplete="current-password"
                data-ocid="login.input"
              />
            </div>
            {loginError && (
              <div className="error-msg" data-ocid="login.error_state">
                {loginError}
              </div>
            )}
            <div
              style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}
            >
              <button
                type="button"
                className="btn"
                style={{ flex: 1 }}
                onClick={handleLogin}
                data-ocid="login.submit_button"
              >
                <i className="fas fa-sign-in-alt" /> लॉगिन करें
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginError("");
                }}
                data-ocid="login.cancel_button"
              >
                रद्द करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
