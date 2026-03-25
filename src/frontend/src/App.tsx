import { useEffect, useState } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const today = new Date().toISOString().split("T")[0];

const KHATA_KEY = "nursery_khata_transactions";

// ─── Khata Bahi Types ─────────────────────────────────────────────────────────

interface KBItem {
  plant: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface KBTransaction {
  id: number;
  block: string;
  panchayat: string;
  customerName: string;
  billNo: string;
  billDate: string;
  workCode: string;
  paymentDate: string;
  prsName: string;
  mobile: string;
  items: KBItem[];
  total: number;
  timestamp: string;
}

const KB_PLANT_LIST_DEFAULT = [
  "कदंब",
  "आम",
  "जामुन",
  "अर्जुन",
  "महोगनी",
  "सागवान",
  "लीची",
  "अमरूद",
  "नीम",
  "आंवला",
  "अशोक",
  "गुलाब",
  "तुलसी",
  "बरगद",
  "पीपल",
];

// ─── Smart Billing Types & Constants ─────────────────────────────────────────

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
  ADAPUR: [],
  ARERAJ: [],
  Bankatwa: [],
  "CHAKIA (PIPRA)": [],
  Chawradano: [],
  CHIRAIYA: [],
  DHAKA: [],
  GHORASAHAN: [],
  KALYANPUR: [],
  KESARIA: [],
  Kotwa: [],
  MADHUBAN: [],
  MEHSI: [],
  PAHARPUR: [],
  PAKRIDAYAL: [],
  PATAHI: [],
  Phenhara: [],
  "Pipra Kothi": [],
  RAMGARHWA: [],
  RAXAUL: [],
  Sangrampur: [],
  Tetariya: [],
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
  const amt = computeAmount(rate, qty);
  const trans = Number.parseFloat(transport) || 0;
  const p = Number.parseFloat(paid) || 0;
  return Math.max(0, amt + trans - p);
}

// ─── Shared ItemRow Component ────────────────────────────────────────────────
type ItemRowItem = {
  id: number;
  plant: string;
  customPlant: string;
  qty: string;
  price: string;
};

function ItemRow({
  item,
  index,
  items,
  setItems,
  plantList,
  ocidPrefix,
}: {
  item: ItemRowItem;
  index: number;
  items: ItemRowItem[];
  setItems: (v: ItemRowItem[]) => void;
  plantList: string[];
  ocidPrefix: string;
}) {
  const updateItem = (field: string, value: string) => {
    const updated = items.map((it, i) =>
      i === index ? { ...it, [field]: value } : it,
    );
    setItems(updated);
  };
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        alignItems: "center",
        marginBottom: "10px",
        background: "white",
        padding: "10px",
        borderRadius: "40px",
      }}
    >
      <select
        style={{
          flex: "2 1 160px",
          padding: "10px 14px",
          border: "2px solid #cfe1b9",
          borderRadius: "40px",
          fontSize: "0.95rem",
          outline: "none",
          background: "white",
        }}
        value={item.plant}
        onChange={(e) => updateItem("plant", e.target.value)}
        required
      >
        <option value="">-- पौधा चुनें --</option>
        {plantList.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
        <option value="OTHER">✨ अन्य पौधा (नया नाम लिखें)</option>
      </select>
      {item.plant === "OTHER" && (
        <input
          type="text"
          style={{
            flex: "2 1 160px",
            padding: "10px 14px",
            border: "2px solid #cfe1b9",
            borderRadius: "40px",
            fontSize: "0.95rem",
            outline: "none",
          }}
          placeholder="नए पौधे का नाम लिखें"
          value={item.customPlant}
          onChange={(e) => updateItem("customPlant", e.target.value)}
          required
        />
      )}
      <input
        type="number"
        style={{
          flex: "1 1 80px",
          padding: "10px 14px",
          border: "2px solid #cfe1b9",
          borderRadius: "40px",
          fontSize: "0.95rem",
          outline: "none",
        }}
        placeholder="मात्रा"
        min="1"
        value={item.qty}
        onChange={(e) => updateItem("qty", e.target.value)}
        required
      />
      <input
        type="number"
        style={{
          flex: "1 1 100px",
          padding: "10px 14px",
          border: "2px solid #cfe1b9",
          borderRadius: "40px",
          fontSize: "0.95rem",
          outline: "none",
        }}
        placeholder="कीमत ₹"
        min="0"
        step="1"
        value={item.price}
        onChange={(e) => updateItem("price", e.target.value)}
        required
      />
      <button
        type="button"
        style={{
          background: "#e76f51",
          color: "white",
          border: "none",
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          fontSize: "1rem",
          cursor: "pointer",
          flexShrink: 0,
        }}
        onClick={() => {
          if (items.length > 1) setItems(items.filter((_, i) => i !== index));
        }}
        disabled={items.length <= 1}
        data-ocid={`${ocidPrefix}.delete_button`}
      >
        ✕
      </button>
    </div>
  );
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
  const [kbTransactions, setKbTransactions] = useState<KBTransaction[]>(() => {
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
  const [kbPlantList, setKbPlantList] = useState<string[]>(
    KB_PLANT_LIST_DEFAULT,
  );
  const [kbFormBlock, setKbFormBlock] = useState("");
  const [kbFormPanchayat, setKbFormPanchayat] = useState("");
  const [kbFormCustomer, setKbFormCustomer] = useState("");
  const [kbFormBillNo, setKbFormBillNo] = useState("");
  const [kbFormBillDate, setKbFormBillDate] = useState(today);
  const [kbFormWorkCode, setKbFormWorkCode] = useState("");
  const [kbFormPaymentDate, setKbFormPaymentDate] = useState("");
  const [kbFormPrsName, setKbFormPrsName] = useState("");
  const [kbFormMobile, setKbFormMobile] = useState("");
  const [kbFormItems, setKbFormItems] = useState<
    Array<{
      id: number;
      plant: string;
      customPlant: string;
      qty: string;
      price: string;
    }>
  >([{ id: Date.now(), plant: "", customPlant: "", qty: "", price: "" }]);
  const [kbSearchBlock, setKbSearchBlock] = useState("");
  const [kbSearchPanchayat, setKbSearchPanchayat] = useState("");
  const [kbSearchCustomer, setKbSearchCustomer] = useState("");
  const [kbEditModal, setKbEditModal] = useState(false);
  const [kbEditId, setKbEditId] = useState<number | null>(null);
  const [kbEditBlock, setKbEditBlock] = useState("");
  const [kbEditPanchayat, setKbEditPanchayat] = useState("");
  const [kbEditCustomer, setKbEditCustomer] = useState("");
  const [kbEditBillNo, setKbEditBillNo] = useState("");
  const [kbEditBillDate, setKbEditBillDate] = useState("");
  const [kbEditWorkCode, setKbEditWorkCode] = useState("");
  const [kbEditPaymentDate, setKbEditPaymentDate] = useState("");
  const [kbEditPrsName, setKbEditPrsName] = useState("");
  const [kbEditMobile, setKbEditMobile] = useState("");
  const [kbEditItems, setKbEditItems] = useState<
    Array<{
      id: number;
      plant: string;
      customPlant: string;
      qty: string;
      price: string;
    }>
  >([]);

  // Smart Billing state
  const [smartBills, setSmartBills] = useState<SmartBill[]>(() => {
    const stored = localStorage.getItem("jeevika_payment_system_final");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {}
    }
    return [
      {
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
      },
    ];
  });
  const [globalFinancialYear, setGlobalFinancialYear] = useState("2025-2026");
  const [editingSmartBill, setEditingSmartBill] = useState<SmartBill | null>(
    null,
  );
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

    // Filter bills
    let filtered = smartBills;
    if (filterBlock)
      filtered = filtered.filter((b) =>
        b.block.toLowerCase().includes(filterBlock.toLowerCase()),
      );
    if (filterPanchayat)
      filtered = filtered.filter((b) =>
        b.panchayat.toLowerCase().includes(filterPanchayat.toLowerCase()),
      );
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
    if (filterPayment) {
      if (filterPayment === "paid")
        filtered = filtered.filter((b) => b.pending === 0);
      else if (filterPayment === "partial")
        filtered = filtered.filter(
          (b) =>
            b.paid > 0 && b.pending > 0 && b.pending < b.amount + b.transport,
        );
      else if (filterPayment === "pending")
        filtered = filtered.filter((b) => b.paid === 0);
    }

    const totalAmount = filtered.reduce((s, b) => s + b.amount, 0);
    const totalTransport = filtered.reduce((s, b) => s + b.transport, 0);
    const totalPaid = filtered.reduce((s, b) => s + b.paid, 0);
    const totalPending = filtered.reduce((s, b) => s + b.pending, 0);
    const grandTotal = filtered.reduce((s, b) => s + b.amount + b.transport, 0);

    // const allTotalAmount = smartBills.reduce((s, b) => s + b.amount, 0);
    const allGrandTotal = smartBills.reduce(
      (s, b) => s + b.amount + b.transport,
      0,
    );
    const allPaid = smartBills.reduce((s, b) => s + b.paid, 0);
    const allPending = smartBills.reduce((s, b) => s + b.pending, 0);

    const liveAmount = computeAmount(sbRate, sbQty);
    const livePending = computePending(sbRate, sbQty, sbTransport, sbPaid);

    const uniqueYears = [
      ...new Set(smartBills.map((b) => b.financialYear).filter(Boolean)),
    ];
    const panchayatOptions =
      sbBlock && PANCHAYAT_MAP[sbBlock] ? PANCHAYAT_MAP[sbBlock] : [];

    function saveSmartBills(updated: SmartBill[]) {
      setSmartBills(updated);
      localStorage.setItem(
        "jeevika_payment_system_final",
        JSON.stringify(updated),
      );
    }

    function handleAddBill(e: React.FormEvent) {
      e.preventDefault();
      if (!sbBlock || !sbPanchayat || !sbMaterial || !sbRate || !sbQty) {
        alert("सभी जरूरी फ़ील्ड भरें।");
        return;
      }
      const rate = Number.parseFloat(sbRate) || 0;
      const qty = Number.parseFloat(sbQty) || 0;
      const transport = Number.parseFloat(sbTransport) || 0;
      const paid = Number.parseFloat(sbPaid) || 0;
      const amount = rate * qty;
      const pending = Math.max(0, amount + transport - paid);
      const bill: SmartBill = {
        id: Date.now(),
        billNumber: sbBillNumber || generateBillNumber(smartBills),
        date: sbDate || today,
        state: "बिहार",
        district: "पूर्वी चंपारण",
        block: sbBlock,
        panchayat: sbPanchayat,
        material: sbMaterial,
        rate,
        quantity: qty,
        amount,
        transport,
        paid,
        pending,
        vendor: sbVendor,
        financialYear: sbFinYear || globalFinancialYear,
      };
      saveSmartBills([...smartBills, bill]);
      // Reset form
      setSbBillNumber("");
      setSbMaterial("");
      setSbRate("");
      setSbQty("");
      setSbTransport("0");
      setSbPaid("0");
      setSbDate(today);
      alert("बिल सेव हो गया! ✓");
    }

    function handleDeleteBill(id: number) {
      if (confirm("क्या आप इस बिल को डिलीट करना चाहते हैं?")) {
        saveSmartBills(smartBills.filter((b) => b.id !== id));
      }
    }

    function handleEditSave(e: React.FormEvent) {
      e.preventDefault();
      if (!editingSmartBill) return;
      const rate = editingSmartBill.rate;
      const qty = editingSmartBill.quantity;
      const transport = editingSmartBill.transport;
      const paid = editingSmartBill.paid;
      const amount = rate * qty;
      const pending = Math.max(0, amount + transport - paid);
      const updated = { ...editingSmartBill, amount, pending };
      saveSmartBills(
        smartBills.map((b) => (b.id === updated.id ? updated : b)),
      );
      setEditingSmartBill(null);
      alert("बिल अपडेट हो गया! ✓");
    }

    function handlePrintFiltered() {
      const rows = filtered
        .map((b, i) => {
          const status =
            b.pending === 0 ? "पूर्ण भुगतान" : b.paid > 0 ? "आंशिक" : "बकाया";
          return `<tr>
          <td>${i + 1}</td>
          <td>${b.billNumber}</td>
          <td>${b.date}</td>
          <td>${b.block}</td>
          <td>${b.panchayat}</td>
          <td>${b.material}</td>
          <td>₹${b.rate}</td>
          <td>${b.quantity}</td>
          <td>₹${b.amount}</td>
          <td>₹${b.transport}</td>
          <td>₹${b.amount + b.transport}</td>
          <td>₹${b.paid}</td>
          <td>₹${b.pending}</td>
          <td>${status}</td>
          <td>${b.vendor}</td>
        </tr>`;
        })
        .join("");
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>स्मार्ट बिलिंग रिपोर्ट</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;}h2{color:#1b4d3e;text-align:center;}table{width:100%;border-collapse:collapse;font-size:12px;}th,td{border:1px solid #ccc;padding:6px;text-align:left;}th{background:#2b8c4a;color:white;}.footer{margin-top:40px;display:flex;justify-content:space-between;}</style>
      </head><body>
      <h2>जीविका दीदी ग्रीन नर्सरी — स्मार्ट बिलिंग रिपोर्ट</h2>
      <p style="text-align:center">पूर्वी चंपारण, बिहार - 845401 | मो: 9504800073 | वित्तीय वर्ष: ${globalFinancialYear}</p>
      <hr/>
      <table><thead><tr><th>#</th><th>बिल नं.</th><th>दिनांक</th><th>ब्लॉक</th><th>पंचायत</th><th>सामग्री</th><th>दर</th><th>मात्रा</th><th>राशि</th><th>गाड़ी भाड़ा</th><th>कुल देय</th><th>प्राप्त</th><th>बकाया</th><th>स्थिति</th><th>विक्रेता</th></tr></thead>
      <tbody>${rows}
      <tr style="background:#f9c74f;font-weight:bold"><td colspan="8">कुल</td><td>₹${totalAmount}</td><td>₹${totalTransport}</td><td>₹${grandTotal}</td><td>₹${totalPaid}</td><td>₹${totalPending}</td><td></td><td></td></tr>
      </tbody></table>
      <div class="footer"><div><p>_________________</p><p>विक्रेता हस्ताक्षर</p></div><div><p>दिनांक: ${new Date().toLocaleDateString("hi-IN")}</p></div></div>
      </body></html>`;
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
        w.print();
      }
    }

    const inputSt: React.CSSProperties = {
      width: "100%",
      padding: "10px 14px",
      border: "1px solid #a5d6a7",
      borderRadius: "6px",
      fontSize: "0.95rem",
      outline: "none",
      background: "white",
    };
    const labelSt: React.CSSProperties = {
      fontWeight: 600,
      color: "#1e6f3f",
      display: "block",
      marginBottom: "4px",
      fontSize: "0.9rem",
    };
    const cardSt: React.CSSProperties = {
      background: "white",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "20px",
      boxShadow: "0 2px 8px rgba(0,80,20,0.1)",
      border: "1px solid #c8e6c9",
    };

    return (
      <div style={{ maxWidth: "1300px", margin: "0 auto", padding: "16px" }}>
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #2b8c4a, #1e6f3f)",
            color: "white",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "1.4rem" }}>
                🌿 जीविका दीदी ग्रीन नर्सरी
              </h2>
              <p
                style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.9 }}
              >
                पूर्वी चंपारण, बिहार | मो: 9504800073
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.2)",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "0.85rem" }}>
                  📅 वित्तीय वर्ष: <strong>{globalFinancialYear}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const ny = window.prompt(
                      "वित्तीय वर्ष बदलें (उदा: 2025-2026):",
                      globalFinancialYear,
                    );
                    if (ny?.trim()) setGlobalFinancialYear(ny.trim());
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    padding: "0",
                  }}
                  title="वित्तीय वर्ष बदलें"
                  data-ocid="smartBilling.edit_button"
                >
                  ✏️
                </button>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.5)",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
                data-ocid="smartBilling.close_button"
              >
                🚪 लॉगआउट
              </button>
            </div>
          </div>
          {/* Details bar */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "12px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.82rem", opacity: 0.9 }}>
              🏛️ राज्य: बिहार
            </span>
            <span style={{ fontSize: "0.82rem", opacity: 0.9 }}>
              📍 जिला: पूर्वी चंपारण
            </span>
            <span style={{ fontSize: "0.82rem", opacity: 0.9 }}>
              📊 कुल बिल: {smartBills.length}
            </span>
            <span style={{ fontSize: "0.82rem", opacity: 0.9 }}>
              💰 कुल राशि: ₹{allGrandTotal.toLocaleString("hi-IN")}
            </span>
            <span style={{ fontSize: "0.82rem", opacity: 0.9 }}>
              ✅ प्राप्त: ₹{allPaid.toLocaleString("hi-IN")}
            </span>
            <span style={{ fontSize: "0.82rem", opacity: 0.9 }}>
              ⏳ बकाया: ₹{allPending.toLocaleString("hi-IN")}
            </span>
          </div>
        </div>

        {/* Dashboard grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          {/* Bill Form */}
          <div style={cardSt}>
            <h3
              style={{
                color: "#1e6f3f",
                marginTop: 0,
                marginBottom: "16px",
                paddingBottom: "10px",
                borderBottom: "2px solid #e8f5e9",
              }}
            >
              ➕ नया बिल जोड़ें
            </h3>
            <form onSubmit={handleAddBill}>
              {/* State/District readonly */}
              <div
                style={{ display: "flex", gap: "12px", marginBottom: "12px" }}
              >
                <div style={{ flex: 1 }}>
                  <label htmlFor="sb-f1" style={labelSt}>
                    राज्य
                  </label>
                  <input
                    id="sb-f1"
                    style={{ ...inputSt, background: "#f5f5f5", color: "#666" }}
                    value="बिहार"
                    readOnly
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="sb-f2" style={labelSt}>
                    जिला
                  </label>
                  <input
                    id="sb-f2"
                    style={{ ...inputSt, background: "#f5f5f5", color: "#666" }}
                    value="पूर्वी चंपारण"
                    readOnly
                  />
                </div>
              </div>
              {/* Block + Panchayat */}
              <div
                style={{ display: "flex", gap: "12px", marginBottom: "12px" }}
              >
                <div style={{ flex: 1 }}>
                  <label htmlFor="sb-f3" style={labelSt}>
                    ब्लॉक <span style={{ color: "red" }}>*</span>
                  </label>
                  <select
                    id="sb-f3"
                    style={inputSt}
                    value={sbBlock}
                    onChange={(e) => {
                      setSbBlock(e.target.value);
                      setSbPanchayat("");
                    }}
                    required
                    data-ocid="smartBilling.select"
                  >
                    <option value="">-- ब्लॉक चुनें --</option>
                    {ALL_BLOCKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="sb-f4" style={labelSt}>
                    पंचायत <span style={{ color: "red" }}>*</span>
                  </label>
                  <select
                    id="sb-f4"
                    style={inputSt}
                    value={sbPanchayat}
                    onChange={(e) => setSbPanchayat(e.target.value)}
                    required
                    data-ocid="smartBilling.select"
                  >
                    <option value="">-- पंचायत चुनें --</option>
                    {panchayatOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Bill No + Date */}
              <div
                style={{ display: "flex", gap: "12px", marginBottom: "12px" }}
              >
                <div style={{ flex: 1 }}>
                  <label htmlFor="sb-f5" style={labelSt}>
                    बिल नंबर
                  </label>
                  <input
                    id="sb-f5"
                    style={inputSt}
                    type="text"
                    placeholder={generateBillNumber(smartBills)}
                    value={sbBillNumber}
                    onChange={(e) => setSbBillNumber(e.target.value)}
                    data-ocid="smartBilling.input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="sb-f6" style={labelSt}>
                    दिनांक <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    id="sb-f6"
                    style={inputSt}
                    type="date"
                    required
                    value={sbDate}
                    onChange={(e) => setSbDate(e.target.value)}
                    data-ocid="smartBilling.input"
                  />
                </div>
              </div>
              {/* Material + Vendor */}
              <div
                style={{ display: "flex", gap: "12px", marginBottom: "12px" }}
              >
                <div style={{ flex: 2 }}>
                  <label htmlFor="sb-f7" style={labelSt}>
                    सामग्री का नाम <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    id="sb-f7"
                    style={inputSt}
                    type="text"
                    placeholder="जैसे: बांस गेबियन"
                    required
                    value={sbMaterial}
                    onChange={(e) => setSbMaterial(e.target.value)}
                    data-ocid="smartBilling.input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="sb-f8" style={labelSt}>
                    विक्रेता
                  </label>
                  <input
                    id="sb-f8"
                    style={inputSt}
                    type="text"
                    value={sbVendor}
                    onChange={(e) => setSbVendor(e.target.value)}
                    data-ocid="smartBilling.input"
                  />
                </div>
              </div>
              {/* Rate + Qty + Amount */}
              <div
                style={{ display: "flex", gap: "12px", marginBottom: "12px" }}
              >
                <div style={{ flex: 1 }}>
                  <label htmlFor="sb-f9" style={labelSt}>
                    दर (₹) <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    id="sb-f9"
                    style={inputSt}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    required
                    value={sbRate}
                    onChange={(e) => setSbRate(e.target.value)}
                    data-ocid="smartBilling.input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="sb-f10" style={labelSt}>
                    मात्रा <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    id="sb-f10"
                    style={inputSt}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    required
                    value={sbQty}
                    onChange={(e) => setSbQty(e.target.value)}
                    data-ocid="smartBilling.input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="sb-f11" style={labelSt}>
                    राशि (₹)
                  </label>
                  <input
                    id="sb-f11"
                    style={{
                      ...inputSt,
                      background: "#e8f5e9",
                      fontWeight: 700,
                      color: "#2b8c4a",
                    }}
                    value={`₹ ${liveAmount.toLocaleString("hi-IN")}`}
                    readOnly
                  />
                </div>
              </div>
              {/* Transport + Financial Year */}
              <div
                style={{ display: "flex", gap: "12px", marginBottom: "12px" }}
              >
                <div style={{ flex: 1 }}>
                  <label htmlFor="sb-f12" style={labelSt}>
                    गाड़ी भाड़ा (₹)
                  </label>
                  <input
                    id="sb-f12"
                    style={{ ...inputSt, borderColor: "#e67e22" }}
                    type="number"
                    min="0"
                    step="0.01"
                    value={sbTransport}
                    onChange={(e) => setSbTransport(e.target.value)}
                    data-ocid="smartBilling.input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="sb-f13" style={labelSt}>
                    वित्तीय वर्ष
                  </label>
                  <input
                    id="sb-f13"
                    style={inputSt}
                    type="text"
                    placeholder="2025-2026"
                    value={sbFinYear}
                    onChange={(e) => setSbFinYear(e.target.value)}
                    data-ocid="smartBilling.input"
                  />
                </div>
              </div>
              {/* कुल देय */}
              <div
                style={{
                  background: "#e8f5e9",
                  border: "1px solid #a5d6a7",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "#1e6f3f",
                    fontSize: "1rem",
                    marginBottom: "6px",
                  }}
                >
                  💰 कुल देय राशि: ₹
                  {(
                    liveAmount + (Number.parseFloat(sbTransport) || 0)
                  ).toLocaleString("hi-IN")}
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label
                      htmlFor="sb-paid-input"
                      style={{ ...labelSt, color: "#2196f3" }}
                    >
                      प्राप्त राशि (₹)
                    </label>
                    <input
                      id="sb-paid-input"
                      style={{ ...inputSt, borderColor: "#2196f3" }}
                      type="number"
                      min="0"
                      step="0.01"
                      value={sbPaid}
                      onChange={(e) => setSbPaid(e.target.value)}
                      onFocus={(e) => (e.target as HTMLInputElement).select()}
                      data-ocid="smartBilling.input"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      htmlFor="sb-pending-display"
                      style={{
                        ...labelSt,
                        color: livePending > 0 ? "#ff9800" : "#2b8c4a",
                      }}
                    >
                      बकाया (₹)
                    </label>
                    <input
                      id="sb-pending-display"
                      style={{
                        ...inputSt,
                        background: livePending > 0 ? "#fff3e0" : "#e8f5e9",
                        fontWeight: 700,
                        color: livePending > 0 ? "#ff9800" : "#2b8c4a",
                      }}
                      value={
                        livePending > 0
                          ? `₹ ${livePending.toLocaleString("hi-IN")}`
                          : "✓ पूर्ण भुगतान"
                      }
                      readOnly
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                style={{
                  background: "#2b8c4a",
                  color: "white",
                  border: "none",
                  padding: "12px 28px",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "100%",
                }}
                data-ocid="smartBilling.submit_button"
              >
                💾 बिल सेव करें
              </button>
            </form>
          </div>

          {/* Filter Card */}
          <div style={cardSt}>
            <h3
              style={{
                color: "#1e6f3f",
                marginTop: 0,
                marginBottom: "16px",
                paddingBottom: "10px",
                borderBottom: "2px solid #e8f5e9",
              }}
            >
              🔍 खोज / फ़िल्टर
            </h3>
            <div style={{ marginBottom: "12px" }}>
              <label htmlFor="sb-f14" style={labelSt}>
                ब्लॉक से खोजें
              </label>
              <select
                id="sb-f14"
                style={inputSt}
                value={filterBlock}
                onChange={(e) => setFilterBlock(e.target.value)}
                data-ocid="smartBilling.select"
              >
                <option value="">सभी ब्लॉक</option>
                {ALL_BLOCKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label htmlFor="sb-f15" style={labelSt}>
                पंचायत से खोजें
              </label>
              <select
                id="sb-f15"
                style={inputSt}
                value={filterPanchayat}
                onChange={(e) => setFilterPanchayat(e.target.value)}
                data-ocid="smartBilling.select"
              >
                <option value="">सभी पंचायत</option>
                {filterBlock && PANCHAYAT_MAP[filterBlock]
                  ? PANCHAYAT_MAP[filterBlock].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))
                  : [...new Set(smartBills.map((b) => b.panchayat))].map(
                      (p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ),
                    )}
              </select>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label htmlFor="sb-f16" style={labelSt}>
                बिल नंबर से खोजें
              </label>
              <input
                id="sb-f16"
                style={inputSt}
                type="text"
                placeholder="बिल नंबर"
                value={filterBillNo}
                onChange={(e) => setFilterBillNo(e.target.value)}
                data-ocid="smartBilling.search_input"
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label htmlFor="sb-f17" style={labelSt}>
                सामग्री से खोजें
              </label>
              <input
                id="sb-f17"
                style={inputSt}
                type="text"
                placeholder="सामग्री का नाम"
                value={filterMaterial}
                onChange={(e) => setFilterMaterial(e.target.value)}
                data-ocid="smartBilling.search_input"
              />
            </div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="sb-f18" style={labelSt}>
                  वित्तीय वर्ष
                </label>
                <select
                  id="sb-f18"
                  style={inputSt}
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  data-ocid="smartBilling.select"
                >
                  <option value="">सभी वर्ष</option>
                  {uniqueYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="sb-f19" style={labelSt}>
                  भुगतान स्थिति
                </label>
                <select
                  id="sb-f19"
                  style={inputSt}
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                  data-ocid="smartBilling.select"
                >
                  <option value="">सभी</option>
                  <option value="paid">पूर्ण भुगतान</option>
                  <option value="partial">आंशिक भुगतान</option>
                  <option value="pending">बकाया</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  setFilterBlock("");
                  setFilterPanchayat("");
                  setFilterBillNo("");
                  setFilterMaterial("");
                  setFilterYear("");
                  setFilterPayment("");
                }}
                style={{
                  flex: 1,
                  background: "#f5f5f5",
                  border: "1px solid #ccc",
                  color: "#555",
                  padding: "10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
                data-ocid="smartBilling.secondary_button"
              >
                🔄 रीसेट
              </button>
              <button
                type="button"
                onClick={handlePrintFiltered}
                style={{
                  flex: 1,
                  background: "#1565c0",
                  color: "white",
                  border: "none",
                  padding: "10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
                data-ocid="smartBilling.primary_button"
              >
                🖨️ प्रिंट करें
              </button>
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div style={cardSt}>
          <h3
            style={{
              color: "#1e6f3f",
              marginTop: 0,
              marginBottom: "16px",
              paddingBottom: "10px",
              borderBottom: "2px solid #e8f5e9",
            }}
          >
            📋 बिल रिकॉर्ड ({filtered.length}/{smartBills.length})
          </h3>
          {filtered.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#888" }}
              data-ocid="smartBilling.empty_state"
            >
              कोई बिल नहीं मिला।
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.88rem",
                }}
              >
                <thead>
                  <tr style={{ background: "#2b8c4a", color: "white" }}>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      बिल नं.
                    </th>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      दिनांक
                    </th>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ब्लॉक
                    </th>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      पंचायत
                    </th>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      सामग्री
                    </th>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      दर
                    </th>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      मात्रा
                    </th>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      राशि
                    </th>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      गाड़ी
                    </th>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      कुल देय
                    </th>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      प्राप्त
                    </th>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      बकाया
                    </th>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      स्थिति
                    </th>
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      क्रिया
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((bill, i) => {
                    const isPaid = bill.pending === 0;
                    const isPartial = bill.paid > 0 && bill.pending > 0;
                    const statusColor = isPaid
                      ? "#2b8c4a"
                      : isPartial
                        ? "#f57c00"
                        : "#c62828";
                    const statusBg = isPaid
                      ? "#e8f5e9"
                      : isPartial
                        ? "#fff3e0"
                        : "#ffebee";
                    const statusText = isPaid
                      ? "✅ पूर्ण"
                      : isPartial
                        ? "⚡ आंशिक"
                        : "⏳ बकाया";
                    return (
                      <tr
                        key={bill.id}
                        style={{
                          background: i % 2 === 0 ? "#fafafa" : "white",
                        }}
                        data-ocid={`smartBilling.item.${i + 1}`}
                      >
                        <td style={{ padding: "8px" }}>{i + 1}</td>
                        <td style={{ padding: "8px", fontWeight: 600 }}>
                          {bill.billNumber}
                        </td>
                        <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                          {bill.date}
                        </td>
                        <td style={{ padding: "8px" }}>{bill.block}</td>
                        <td style={{ padding: "8px" }}>{bill.panchayat}</td>
                        <td style={{ padding: "8px" }}>{bill.material}</td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          ₹{bill.rate}
                        </td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          {bill.quantity}
                        </td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          ₹{bill.amount}
                        </td>
                        <td
                          style={{
                            padding: "8px",
                            textAlign: "right",
                            color: "#e67e22",
                          }}
                        >
                          ₹{bill.transport}
                        </td>
                        <td
                          style={{
                            padding: "8px",
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        >
                          ₹{bill.amount + bill.transport}
                        </td>
                        <td
                          style={{
                            padding: "8px",
                            textAlign: "right",
                            color: "#2196f3",
                          }}
                        >
                          ₹{bill.paid}
                        </td>
                        <td
                          style={{
                            padding: "8px",
                            textAlign: "right",
                            color: bill.pending > 0 ? "#ff9800" : "#2b8c4a",
                            fontWeight: 700,
                          }}
                        >
                          {bill.pending > 0 ? `₹${bill.pending}` : "—"}
                        </td>
                        <td style={{ padding: "8px" }}>
                          <span
                            style={{
                              background: statusBg,
                              color: statusColor,
                              padding: "3px 8px",
                              borderRadius: "12px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                            }}
                          >
                            {statusText}
                          </span>
                        </td>
                        <td style={{ padding: "8px" }}>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              type="button"
                              onClick={() => setEditingSmartBill({ ...bill })}
                              style={{
                                background: "#1565c0",
                                color: "white",
                                border: "none",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.78rem",
                              }}
                              data-ocid={`smartBilling.edit_button.${i + 1}`}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBill(bill.id)}
                              style={{
                                background: "#c62828",
                                color: "white",
                                border: "none",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.78rem",
                              }}
                              data-ocid={`smartBilling.delete_button.${i + 1}`}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Totals */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {[
            {
              label: "कुल बिल",
              value: filtered.length,
              color: "#1565c0",
              bg: "#e3f2fd",
            },
            {
              label: "कुल राशि",
              value: `₹${totalAmount.toLocaleString("hi-IN")}`,
              color: "#2b8c4a",
              bg: "#e8f5e9",
            },
            {
              label: "गाड़ी भाड़ा",
              value: `₹${totalTransport.toLocaleString("hi-IN")}`,
              color: "#e67e22",
              bg: "#fff3e0",
            },
            {
              label: "कुल प्राप्त",
              value: `₹${totalPaid.toLocaleString("hi-IN")}`,
              color: "#2196f3",
              bg: "#e3f2fd",
            },
            {
              label: "कुल बकाया",
              value: `₹${totalPending.toLocaleString("hi-IN")}`,
              color: totalPending > 0 ? "#ff9800" : "#2b8c4a",
              bg: totalPending > 0 ? "#fff3e0" : "#e8f5e9",
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: item.bg,
                border: `1px solid ${item.color}30`,
                borderRadius: "10px",
                padding: "14px 16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#666",
                  fontSize: "0.82rem",
                  marginBottom: "4px",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  color: item.color,
                  fontWeight: 700,
                  fontSize: "1.1rem",
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Edit Modal */}
        {editingSmartBill && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingSmartBill(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditingSmartBill(null);
            }}
            role="presentation"
            data-ocid="smartBilling.modal"
          >
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "24px",
                width: "100%",
                maxWidth: "700px",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h3 style={{ margin: 0, color: "#1e6f3f" }}>✏️ बिल एडिट करें</h3>
                <button
                  type="button"
                  onClick={() => setEditingSmartBill(null)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "1.4rem",
                    cursor: "pointer",
                    color: "#c62828",
                  }}
                  data-ocid="smartBilling.close_button"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleEditSave}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <label htmlFor="sb-f20" style={labelSt}>
                      ब्लॉक
                    </label>
                    <select
                      id="sb-f20"
                      style={inputSt}
                      value={editingSmartBill.block}
                      onChange={(e) =>
                        setEditingSmartBill({
                          ...editingSmartBill,
                          block: e.target.value,
                          panchayat: "",
                        })
                      }
                      data-ocid="smartBilling.select"
                    >
                      <option value="">-- चुनें --</option>
                      {ALL_BLOCKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="sb-f21" style={labelSt}>
                      पंचायत
                    </label>
                    <select
                      id="sb-f21"
                      style={inputSt}
                      value={editingSmartBill.panchayat}
                      onChange={(e) =>
                        setEditingSmartBill({
                          ...editingSmartBill,
                          panchayat: e.target.value,
                        })
                      }
                      data-ocid="smartBilling.select"
                    >
                      <option value="">-- चुनें --</option>
                      {(PANCHAYAT_MAP[editingSmartBill.block] || []).map(
                        (p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="sb-f22" style={labelSt}>
                      बिल नंबर
                    </label>
                    <input
                      id="sb-f22"
                      style={inputSt}
                      type="text"
                      value={editingSmartBill.billNumber}
                      onChange={(e) =>
                        setEditingSmartBill({
                          ...editingSmartBill,
                          billNumber: e.target.value,
                        })
                      }
                      data-ocid="smartBilling.input"
                    />
                  </div>
                  <div>
                    <label htmlFor="sb-f23" style={labelSt}>
                      दिनांक
                    </label>
                    <input
                      id="sb-f23"
                      style={inputSt}
                      type="date"
                      value={editingSmartBill.date}
                      onChange={(e) =>
                        setEditingSmartBill({
                          ...editingSmartBill,
                          date: e.target.value,
                        })
                      }
                      data-ocid="smartBilling.input"
                    />
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label htmlFor="sb-f24" style={labelSt}>
                      सामग्री
                    </label>
                    <input
                      id="sb-f24"
                      style={inputSt}
                      type="text"
                      value={editingSmartBill.material}
                      onChange={(e) =>
                        setEditingSmartBill({
                          ...editingSmartBill,
                          material: e.target.value,
                        })
                      }
                      data-ocid="smartBilling.input"
                    />
                  </div>
                  <div>
                    <label htmlFor="sb-f25" style={labelSt}>
                      दर (₹)
                    </label>
                    <input
                      id="sb-f25"
                      style={inputSt}
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingSmartBill.rate}
                      onChange={(e) =>
                        setEditingSmartBill({
                          ...editingSmartBill,
                          rate: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                      data-ocid="smartBilling.input"
                    />
                  </div>
                  <div>
                    <label htmlFor="sb-f26" style={labelSt}>
                      मात्रा
                    </label>
                    <input
                      id="sb-f26"
                      style={inputSt}
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingSmartBill.quantity}
                      onChange={(e) =>
                        setEditingSmartBill({
                          ...editingSmartBill,
                          quantity: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                      data-ocid="smartBilling.input"
                    />
                  </div>
                  <div>
                    <label htmlFor="sb-f27" style={labelSt}>
                      गाड़ी भाड़ा (₹)
                    </label>
                    <input
                      id="sb-f27"
                      style={{ ...inputSt, borderColor: "#e67e22" }}
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingSmartBill.transport}
                      onChange={(e) =>
                        setEditingSmartBill({
                          ...editingSmartBill,
                          transport: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                      data-ocid="smartBilling.input"
                    />
                  </div>
                  <div>
                    <label htmlFor="sb-f28" style={labelSt}>
                      वित्तीय वर्ष
                    </label>
                    <input
                      id="sb-f28"
                      style={inputSt}
                      type="text"
                      value={editingSmartBill.financialYear}
                      onChange={(e) =>
                        setEditingSmartBill({
                          ...editingSmartBill,
                          financialYear: e.target.value,
                        })
                      }
                      data-ocid="smartBilling.input"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sb-edit-paid"
                      style={{ ...labelSt, color: "#2196f3" }}
                    >
                      प्राप्त राशि (₹)
                    </label>
                    <input
                      id="sb-edit-paid"
                      style={{ ...inputSt, borderColor: "#2196f3" }}
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingSmartBill.paid}
                      onChange={(e) => {
                        const paid = Number.parseFloat(e.target.value) || 0;
                        const amt =
                          editingSmartBill.rate * editingSmartBill.quantity;
                        const pending = Math.max(
                          0,
                          amt + editingSmartBill.transport - paid,
                        );
                        setEditingSmartBill({
                          ...editingSmartBill,
                          paid,
                          pending,
                        });
                      }}
                      onFocus={(e) => (e.target as HTMLInputElement).select()}
                      data-ocid="smartBilling.input"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sb-edit-pending"
                      style={{
                        ...labelSt,
                        color:
                          editingSmartBill.pending > 0 ? "#ff9800" : "#2b8c4a",
                      }}
                    >
                      बकाया (₹)
                    </label>
                    <input
                      style={{
                        ...inputSt,
                        background:
                          editingSmartBill.pending > 0 ? "#fff3e0" : "#e8f5e9",
                        fontWeight: 700,
                        color:
                          editingSmartBill.pending > 0 ? "#ff9800" : "#2b8c4a",
                      }}
                      value={
                        editingSmartBill.pending > 0
                          ? `₹ ${editingSmartBill.pending.toLocaleString("hi-IN")}`
                          : "✓ पूर्ण भुगतान"
                      }
                      readOnly
                    />
                  </div>
                  <div>
                    <label htmlFor="sb-f29" style={labelSt}>
                      विक्रेता
                    </label>
                    <input
                      id="sb-f29"
                      style={inputSt}
                      type="text"
                      value={editingSmartBill.vendor}
                      onChange={(e) =>
                        setEditingSmartBill({
                          ...editingSmartBill,
                          vendor: e.target.value,
                        })
                      }
                      data-ocid="smartBilling.input"
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      background: "#2b8c4a",
                      color: "white",
                      border: "none",
                      padding: "12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                    data-ocid="smartBilling.confirm_button"
                  >
                    💾 अपडेट करें
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSmartBill(null)}
                    style={{
                      flex: 1,
                      background: "#f5f5f5",
                      border: "1px solid #ccc",
                      color: "#555",
                      padding: "12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    data-ocid="smartBilling.cancel_button"
                  >
                    रद्द करें
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderKhataBahi() {
    if (!isKhataLoggedIn) return null;

    // Derive unique values for datalists
    const kbBlocks = [
      ...new Set(kbTransactions.map((t) => t.block).filter(Boolean)),
    ];
    const kbPanchayats = [
      ...new Set(kbTransactions.map((t) => t.panchayat).filter(Boolean)),
    ];
    const kbCustomers = [
      ...new Set(kbTransactions.map((t) => t.customerName).filter(Boolean)),
    ];
    const kbPrsNames = [
      ...new Set(kbTransactions.map((t) => t.prsName).filter(Boolean)),
    ];

    // Filter location cards
    let filteredTxns = kbTransactions;
    if (kbSearchBlock)
      filteredTxns = filteredTxns.filter((t) =>
        t.block.toLowerCase().includes(kbSearchBlock.toLowerCase()),
      );
    if (kbSearchPanchayat)
      filteredTxns = filteredTxns.filter((t) =>
        t.panchayat.toLowerCase().includes(kbSearchPanchayat.toLowerCase()),
      );
    if (kbSearchCustomer)
      filteredTxns = filteredTxns.filter((t) =>
        t.customerName.toLowerCase().includes(kbSearchCustomer.toLowerCase()),
      );

    // Group by block+panchayat
    const locationMap = new Map<
      string,
      {
        block: string;
        panchayat: string;
        customers: Map<
          string,
          { name: string; bills: KBTransaction[]; total: number }
        >;
        totalBills: number;
        totalAmount: number;
      }
    >();
    for (const t of filteredTxns) {
      const key = `${t.block}|${t.panchayat}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, {
          block: t.block,
          panchayat: t.panchayat,
          customers: new Map(),
          totalBills: 0,
          totalAmount: 0,
        });
      }
      const loc = locationMap.get(key)!;
      loc.totalBills++;
      loc.totalAmount += t.total || 0;
      if (t.customerName) {
        if (!loc.customers.has(t.customerName)) {
          loc.customers.set(t.customerName, {
            name: t.customerName,
            bills: [],
            total: 0,
          });
        }
        const cust = loc.customers.get(t.customerName)!;
        cust.bills.push(t);
        cust.total += t.total || 0;
      }
    }

    function resetKbForm() {
      setKbFormBlock("");
      setKbFormPanchayat("");
      setKbFormCustomer("");
      setKbFormBillNo("");
      setKbFormBillDate(today);
      setKbFormWorkCode("");
      setKbFormPaymentDate("");
      setKbFormPrsName("");
      setKbFormMobile("");
      setKbFormItems([
        { id: Date.now(), plant: "", customPlant: "", qty: "", price: "" },
      ]);
    }

    function handleKbSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!kbFormBlock || !kbFormPanchayat || !kbFormBillDate) {
        alert("ब्लॉक, पंचायत और बिल दिनांक जरूरी है।");
        return;
      }
      const validItems = kbFormItems.filter((item) => {
        const plantName =
          item.plant === "OTHER" ? item.customPlant.trim() : item.plant;
        return plantName && item.qty && item.price;
      });
      if (validItems.length === 0) {
        alert("कम से कम एक पौधा जोड़ें।");
        return;
      }
      let totalAmount = 0;
      const items: KBItem[] = validItems.map((item) => {
        const plantName =
          item.plant === "OTHER" ? item.customPlant.trim() : item.plant;
        if (
          item.plant === "OTHER" &&
          plantName &&
          !kbPlantList.includes(plantName)
        ) {
          setKbPlantList((prev) => [...prev, plantName]);
        }
        const qty = Number.parseFloat(item.qty) || 0;
        const price = Number.parseFloat(item.price) || 0;
        const subtotal = qty * price;
        totalAmount += subtotal;
        return { plant: plantName, quantity: qty, price, subtotal };
      });
      const txn: KBTransaction = {
        id: Date.now() + Math.random(),
        block: kbFormBlock,
        panchayat: kbFormPanchayat,
        customerName: kbFormCustomer,
        billNo: kbFormBillNo,
        billDate: kbFormBillDate,
        workCode: kbFormWorkCode,
        paymentDate: kbFormPaymentDate,
        prsName: kbFormPrsName,
        mobile: kbFormMobile,
        items,
        total: totalAmount,
        timestamp: new Date().toISOString(),
      };
      const updated = [...kbTransactions, txn];
      setKbTransactions(updated);
      localStorage.setItem(KHATA_KEY, JSON.stringify(updated));
      resetKbForm();
      alert("बिल सेव हो गया!");
    }

    function handleKbDeleteBill(id: number) {
      if (confirm("क्या आप वाकई इस बिल को डिलीट करना चाहते हैं?")) {
        const updated = kbTransactions.filter((t) => t.id !== id);
        setKbTransactions(updated);
        localStorage.setItem(KHATA_KEY, JSON.stringify(updated));
      }
    }

    function handleKbDeleteLocation(block: string, panchayat: string) {
      if (
        confirm(
          `क्या आप वाकई ${block} - ${panchayat} के सभी बिल डिलीट करना चाहते हैं?`,
        )
      ) {
        const updated = kbTransactions.filter(
          (t) => !(t.block === block && t.panchayat === panchayat),
        );
        setKbTransactions(updated);
        localStorage.setItem(KHATA_KEY, JSON.stringify(updated));
      }
    }

    function openEditModal(bill: KBTransaction) {
      setKbEditId(bill.id);
      setKbEditBlock(bill.block);
      setKbEditPanchayat(bill.panchayat);
      setKbEditCustomer(bill.customerName);
      setKbEditBillNo(bill.billNo);
      setKbEditBillDate(bill.billDate);
      setKbEditWorkCode(bill.workCode);
      setKbEditPaymentDate(bill.paymentDate);
      setKbEditPrsName(bill.prsName);
      setKbEditMobile(bill.mobile);
      setKbEditItems(
        (bill.items || []).map((item, i) => ({
          id: Date.now() + i,
          plant: item.plant,
          customPlant: "",
          qty: String(item.quantity),
          price: String(item.price),
        })),
      );
      setKbEditModal(true);
    }

    function handleKbEditSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!kbEditBlock || !kbEditPanchayat || !kbEditBillDate) {
        alert("ब्लॉक, पंचायत और बिल दिनांक जरूरी है।");
        return;
      }
      const validItems = kbEditItems.filter((item) => {
        const plantName =
          item.plant === "OTHER" ? item.customPlant.trim() : item.plant;
        return plantName && item.qty && item.price;
      });
      if (validItems.length === 0) {
        alert("कम से कम एक पौधा जोड़ें।");
        return;
      }
      let totalAmount = 0;
      const items: KBItem[] = validItems.map((item) => {
        const plantName =
          item.plant === "OTHER" ? item.customPlant.trim() : item.plant;
        if (
          item.plant === "OTHER" &&
          plantName &&
          !kbPlantList.includes(plantName)
        ) {
          setKbPlantList((prev) => [...prev, plantName]);
        }
        const qty = Number.parseFloat(item.qty) || 0;
        const price = Number.parseFloat(item.price) || 0;
        const subtotal = qty * price;
        totalAmount += subtotal;
        return { plant: plantName, quantity: qty, price, subtotal };
      });
      const updated = kbTransactions.map((t) =>
        t.id === kbEditId
          ? {
              ...t,
              block: kbEditBlock,
              panchayat: kbEditPanchayat,
              customerName: kbEditCustomer,
              billNo: kbEditBillNo,
              billDate: kbEditBillDate,
              workCode: kbEditWorkCode,
              paymentDate: kbEditPaymentDate,
              prsName: kbEditPrsName,
              mobile: kbEditMobile,
              items,
              total: totalAmount,
            }
          : t,
      );
      setKbTransactions(updated);
      localStorage.setItem(KHATA_KEY, JSON.stringify(updated));
      setKbEditModal(false);
      alert("बिल अपडेट हो गया!");
    }

    function handleKbPrintBill(bill: KBTransaction) {
      const itemRows = (bill.items || [])
        .map((item) => {
          const itemTotal = item.quantity * item.price;
          return `<tr><td>${item.plant}</td><td>${item.quantity}</td><td>₹${item.price}</td><td>₹${itemTotal}</td></tr>`;
        })
        .join("");
      const printDate = new Date().toLocaleDateString("hi-IN");
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>बिल रसीद</title><style>body{font-family:Arial,sans-serif;margin:20px;}h2,h3{color:#1b4d3e;text-align:center;}table{width:100%;border-collapse:collapse;margin:10px 0;}th,td{border:1px solid #b6d7a8;padding:8px;text-align:left;}th{background:#2d6a4f;color:white;}.sig{display:flex;justify-content:space-between;margin-top:50px;}.sig-box{text-align:center;}.sig-line{width:200px;border-bottom:2px solid #333;margin:0 auto 5px;}</style></head><body><h2>जीविका दीदी ग्रीन नर्सरी</h2><p style="text-align:center">पूर्वी चंपारण, बिहार - 845401 | मो: 9504800073</p><hr/><h3>बिल #${bill.billNo || "—"} की रसीद</h3><table><tr><td><b>ब्लॉक:</b> ${bill.block || "—"}</td><td><b>पंचायत:</b> ${bill.panchayat || "—"}</td></tr><tr><td><b>ग्राहक:</b> ${bill.customerName || "—"}</td><td><b>P.R.S नाम:</b> ${bill.prsName || "—"}</td></tr><tr><td><b>मोबाइल:</b> ${bill.mobile || "—"}</td><td><b>बिल दिनांक:</b> ${bill.billDate || "—"}</td></tr><tr><td><b>वर्क कोड:</b> ${bill.workCode || "—"}</td><td><b>भुगतान दिनांक:</b> ${bill.paymentDate || "—"}</td></tr></table><h4>पौधों की सूची:</h4><table><thead><tr><th>पौधे का नाम</th><th>मात्रा</th><th>दर (₹)</th><th>कुल (₹)</th></tr></thead><tbody>${itemRows}<tr style="background:#f9c74f;font-weight:bold"><td colspan="3" style="text-align:right">कुल योग</td><td>₹${bill.total || 0}</td></tr></tbody></table><div class="sig"><div class="sig-box"><div class="sig-line"></div><p>ग्राहक के हस्ताक्षर</p></div><div class="sig-box"><div class="sig-line"></div><p>विक्रेता के हस्ताक्षर</p></div><div class="sig-box"><p>दिनांक: ${printDate}</p></div></div></body></html>`;
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
        w.print();
      }
    }

    const inputStyle = {
      width: "100%",
      padding: "12px 15px",
      border: "2px solid #cfe1b9",
      borderRadius: "40px",
      fontSize: "1rem",
      outline: "none",
      background: "white",
      boxSizing: "border-box" as const,
    };
    const labelStyle = {
      fontWeight: "600" as const,
      color: "#2d6a4f",
      display: "block",
      marginBottom: "4px",
      fontSize: "0.95rem",
    };
    const formGroupStyle = { flex: "1 1 200px" };
    const cardStyle = {
      background: "#f9fbf4",
      borderRadius: "20px",
      padding: "20px",
      marginBottom: "25px",
      border: "1px solid #cfe1b9",
    };

    return (
      <div
        style={{ maxWidth: "1300px", margin: "20px auto", padding: "0 15px" }}
      >
        {/* Header */}
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
          <h2
            style={{
              color: "#1b4d3e",
              borderBottom: "3px solid #a7c957",
              paddingBottom: "10px",
              margin: 0,
            }}
          >
            📒 ब्लॉक/पंचायत वार खाता बही
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

        {/* Datalists */}
        <datalist id="kb-block-list">
          {kbBlocks.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
        <datalist id="kb-panchayat-list">
          {kbPanchayats.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <datalist id="kb-customer-list">
          {kbCustomers.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <datalist id="kb-prs-list">
          {kbPrsNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>

        {/* Form Card */}
        <div style={cardStyle}>
          <h2
            style={{
              color: "#1b4d3e",
              borderBottom: "3px solid #a7c957",
              paddingBottom: "10px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <i className="fas fa-plus-circle" /> नया बिल / खरीदी जोड़ें
          </h2>
          <form onSubmit={handleKbSubmit}>
            {/* Row 1 */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "15px",
                marginBottom: "15px",
                alignItems: "flex-end",
              }}
            >
              <div style={formGroupStyle}>
                <label style={labelStyle} htmlFor="kb-form-block">
                  ब्लॉक <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  id="kb-form-block"
                  style={inputStyle}
                  type="text"
                  list="kb-block-list"
                  placeholder="ब्लॉक का नाम"
                  required
                  value={kbFormBlock}
                  onChange={(e) => setKbFormBlock(e.target.value)}
                  autoComplete="off"
                  data-ocid="khataBahi.input"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle} htmlFor="kb-form-panchayat">
                  पंचायत <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  id="kb-form-panchayat"
                  style={inputStyle}
                  type="text"
                  list="kb-panchayat-list"
                  placeholder="पंचायत का नाम"
                  required
                  value={kbFormPanchayat}
                  onChange={(e) => setKbFormPanchayat(e.target.value)}
                  autoComplete="off"
                  data-ocid="khataBahi.input"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle} htmlFor="kb-form-customer">
                  ग्राहक का नाम
                </label>
                <input
                  id="kb-form-customer"
                  style={inputStyle}
                  type="text"
                  list="kb-customer-list"
                  placeholder="ग्राहक नाम (वैकल्पिक)"
                  value={kbFormCustomer}
                  onChange={(e) => setKbFormCustomer(e.target.value)}
                  autoComplete="off"
                  data-ocid="khataBahi.input"
                />
              </div>
            </div>
            {/* Row 2 */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "15px",
                marginBottom: "15px",
                alignItems: "flex-end",
              }}
            >
              <div style={formGroupStyle}>
                <label style={labelStyle} htmlFor="kb-field-1">
                  बिल नंबर
                </label>
                <input
                  id="kb-field-1"
                  style={inputStyle}
                  type="text"
                  placeholder="बिल नं."
                  value={kbFormBillNo}
                  onChange={(e) => setKbFormBillNo(e.target.value)}
                  data-ocid="khataBahi.input"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle} htmlFor="kb-field-2">
                  बिल दिनांक <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  id="kb-field-2"
                  style={inputStyle}
                  type="date"
                  required
                  value={kbFormBillDate}
                  onChange={(e) => setKbFormBillDate(e.target.value)}
                  data-ocid="khataBahi.input"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle} htmlFor="kb-field-3">
                  वर्क कोड
                </label>
                <input
                  id="kb-field-3"
                  style={inputStyle}
                  type="text"
                  placeholder="वर्क कोड"
                  value={kbFormWorkCode}
                  onChange={(e) => setKbFormWorkCode(e.target.value)}
                  data-ocid="khataBahi.input"
                />
              </div>
            </div>
            {/* Row 3 */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "15px",
                marginBottom: "15px",
                alignItems: "flex-end",
              }}
            >
              <div style={formGroupStyle}>
                <label style={labelStyle} htmlFor="kb-field-4">
                  भुगतान दिनांक
                </label>
                <input
                  id="kb-field-4"
                  style={inputStyle}
                  type="date"
                  value={kbFormPaymentDate}
                  onChange={(e) => setKbFormPaymentDate(e.target.value)}
                  data-ocid="khataBahi.input"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle} htmlFor="kb-field-5">
                  P.R.S नाम
                </label>
                <input
                  id="kb-field-5"
                  style={inputStyle}
                  type="text"
                  list="kb-prs-list"
                  placeholder="P.R.S नाम"
                  value={kbFormPrsName}
                  onChange={(e) => setKbFormPrsName(e.target.value)}
                  autoComplete="off"
                  data-ocid="khataBahi.input"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle} htmlFor="kb-field-6">
                  मोबाइल नंबर
                </label>
                <input
                  id="kb-field-6"
                  style={inputStyle}
                  type="tel"
                  placeholder="98xxxxxx"
                  value={kbFormMobile}
                  onChange={(e) => setKbFormMobile(e.target.value)}
                  data-ocid="khataBahi.input"
                />
              </div>
            </div>

            {/* Items Section */}
            <div
              style={{
                background: "#eaf4e4",
                borderRadius: "20px",
                padding: "20px",
                margin: "20px 0",
              }}
            >
              <div
                style={{
                  ...labelStyle,
                  fontSize: "1.1rem",
                  marginBottom: "12px",
                  display: "block",
                }}
              >
                <i className="fas fa-leaf" /> सामान (पौधे) की सूची
              </div>
              {kbFormItems.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  index={idx}
                  items={kbFormItems}
                  setItems={setKbFormItems}
                  plantList={kbPlantList}
                  ocidPrefix="khataBahi"
                />
              ))}
              <button
                type="button"
                style={{
                  background: "#f9c74f",
                  color: "#2d6a4f",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "50px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onClick={() =>
                  setKbFormItems((prev) => [
                    ...prev,
                    {
                      id: Date.now(),
                      plant: "",
                      customPlant: "",
                      qty: "",
                      price: "",
                    },
                  ])
                }
                data-ocid="khataBahi.secondary_button"
              >
                <i className="fas fa-plus" /> और पौधा जोड़ें
              </button>
            </div>

            <button
              type="submit"
              style={{
                background: "#2d6a4f",
                color: "white",
                border: "none",
                padding: "12px 25px",
                borderRadius: "50px",
                fontSize: "1.1rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
              data-ocid="khataBahi.submit_button"
            >
              <i className="fas fa-save" /> बिल सेव करें
            </button>
          </form>
        </div>

        {/* Search Section */}
        <div
          style={{
            background: "#eaf4e4",
            padding: "20px",
            borderRadius: "20px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ color: "#1b4d3e", marginBottom: "15px" }}>
            <i className="fas fa-search" /> ब्लॉक / पंचायत से खोजें
          </h3>
          <div
            style={{
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div style={formGroupStyle}>
              <label style={labelStyle} htmlFor="kb-field-7">
                ब्लॉक से खोजें
              </label>
              <input
                id="kb-field-7"
                style={inputStyle}
                type="text"
                list="kb-block-list"
                placeholder="ब्लॉक का नाम लिखें"
                value={kbSearchBlock}
                onChange={(e) => setKbSearchBlock(e.target.value)}
                autoComplete="off"
                data-ocid="khataBahi.search_input"
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle} htmlFor="kb-field-8">
                पंचायत से खोजें
              </label>
              <input
                id="kb-field-8"
                style={inputStyle}
                type="text"
                list="kb-panchayat-list"
                placeholder="पंचायत का नाम लिखें"
                value={kbSearchPanchayat}
                onChange={(e) => setKbSearchPanchayat(e.target.value)}
                autoComplete="off"
                data-ocid="khataBahi.search_input"
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle} htmlFor="kb-field-9">
                ग्राहक नाम से
              </label>
              <input
                id="kb-field-9"
                style={inputStyle}
                type="text"
                list="kb-customer-list"
                placeholder="ग्राहक नाम लिखें"
                value={kbSearchCustomer}
                onChange={(e) => setKbSearchCustomer(e.target.value)}
                autoComplete="off"
                data-ocid="khataBahi.search_input"
              />
            </div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setKbSearchBlock("");
                setKbSearchPanchayat("");
                setKbSearchCustomer("");
              }}
              data-ocid="khataBahi.secondary_button"
            >
              <i className="fas fa-undo" /> रीसेट
            </button>
          </div>
        </div>

        {/* Location Cards */}
        {locationMap.size === 0 ? (
          <div
            style={{ textAlign: "center", padding: "40px", color: "#666" }}
            data-ocid="khataBahi.empty_state"
          >
            कोई डेटा नहीं मिला। ऊपर फ़ॉर्म से नया बिल जोड़ें।
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
              gap: "20px",
              marginTop: "25px",
            }}
          >
            {Array.from(locationMap.values()).map((loc, locIdx) => {
              const customers = Array.from(loc.customers.values());
              return (
                <div
                  key={`${loc.block}|${loc.panchayat}`}
                  style={{
                    background: "linear-gradient(145deg, #ffffff, #f1f9ec)",
                    borderRadius: "20px",
                    padding: "18px",
                    borderLeft: "8px solid #2d6a4f",
                    boxShadow: "0 5px 12px rgba(0,0,0,0.05)",
                    position: "relative",
                  }}
                  data-ocid={`khataBahi.item.${locIdx + 1}`}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      display: "flex",
                      gap: "5px",
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        background: "#2d6a4f",
                        color: "white",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "30px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        const bill =
                          loc.customers.size > 0
                            ? Array.from(loc.customers.values())[0].bills[0]
                            : null;
                        if (bill) openEditModal(bill);
                      }}
                      data-ocid={`khataBahi.edit_button.${locIdx + 1}`}
                    >
                      <i className="fas fa-edit" />
                    </button>
                    <button
                      type="button"
                      style={{
                        background: "#e76f51",
                        color: "white",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "30px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        handleKbDeleteLocation(loc.block, loc.panchayat)
                      }
                      data-ocid={`khataBahi.delete_button.${locIdx + 1}`}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                  <h3
                    style={{
                      fontSize: "1.4rem",
                      color: "#1b4d3e",
                      marginBottom: "4px",
                    }}
                  >
                    {loc.block || "—"}
                  </h3>
                  <h4
                    style={{
                      color: "#2d6a4f",
                      marginBottom: "10px",
                      fontSize: "1.05rem",
                    }}
                  >
                    <i className="fas fa-map-marker-alt" />{" "}
                    {loc.panchayat || "—"}
                  </h4>
                  <p style={{ margin: "4px 0", color: "#2d3e2d" }}>
                    <i className="fas fa-users" /> कुल ग्राहक: {customers.length}
                  </p>
                  <p style={{ margin: "4px 0", color: "#2d3e2d" }}>
                    <i className="fas fa-file-invoice" /> कुल बिल:{" "}
                    {loc.totalBills}
                  </p>
                  <p style={{ margin: "4px 0", color: "#2d3e2d" }}>
                    <i className="fas fa-rupee-sign" /> कुल राशि: ₹
                    {loc.totalAmount}
                  </p>

                  {/* Customer List */}
                  <div
                    style={{
                      marginTop: "12px",
                      borderTop: "1px dashed #a7c957",
                      paddingTop: "12px",
                    }}
                  >
                    <strong style={{ color: "#2d6a4f" }}>
                      <i className="fas fa-user" /> ग्राहक:
                    </strong>
                    {customers.length === 0 ? (
                      <p
                        style={{
                          fontSize: "0.9rem",
                          color: "#888",
                          marginTop: "6px",
                        }}
                      >
                        कोई ग्राहक नहीं
                      </p>
                    ) : (
                      customers.map((cust) => (
                        <div
                          key={cust.name}
                          style={{
                            background: "white",
                            border: "1px solid #cfe1b9",
                            borderRadius: "10px",
                            padding: "10px",
                            marginTop: "8px",
                            fontSize: "0.9rem",
                          }}
                        >
                          <strong style={{ color: "#2d6a4f" }}>
                            {cust.name}
                          </strong>{" "}
                          — ₹{cust.total} ({cust.bills.length} बिल)
                          <div style={{ marginTop: "6px", marginLeft: "10px" }}>
                            {cust.bills
                              .sort((a, b) =>
                                (b.billDate || "").localeCompare(
                                  a.billDate || "",
                                ),
                              )
                              .map((bill) => (
                                <div
                                  key={bill.id}
                                  style={{
                                    background: "#f9fbf4",
                                    borderLeft: "3px solid #f9c74f",
                                    padding: "8px",
                                    marginBottom: "5px",
                                    fontSize: "0.82rem",
                                    position: "relative",
                                  }}
                                >
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "5px",
                                      right: "5px",
                                      display: "flex",
                                      gap: "3px",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      style={{
                                        background: "#2d6a4f",
                                        color: "white",
                                        border: "none",
                                        padding: "3px 7px",
                                        borderRadius: "20px",
                                        fontSize: "0.7rem",
                                        cursor: "pointer",
                                      }}
                                      onClick={() => openEditModal(bill)}
                                      data-ocid="khataBahi.edit_button"
                                    >
                                      <i className="fas fa-edit" />
                                    </button>
                                    <button
                                      type="button"
                                      style={{
                                        background: "#e76f51",
                                        color: "white",
                                        border: "none",
                                        padding: "3px 7px",
                                        borderRadius: "20px",
                                        fontSize: "0.7rem",
                                        cursor: "pointer",
                                      }}
                                      onClick={() =>
                                        handleKbDeleteBill(bill.id)
                                      }
                                      data-ocid="khataBahi.delete_button"
                                    >
                                      <i className="fas fa-trash" />
                                    </button>
                                    <button
                                      type="button"
                                      style={{
                                        background: "#2d6a4f",
                                        color: "white",
                                        border: "none",
                                        padding: "3px 7px",
                                        borderRadius: "20px",
                                        fontSize: "0.7rem",
                                        cursor: "pointer",
                                      }}
                                      onClick={() => handleKbPrintBill(bill)}
                                      data-ocid="khataBahi.primary_button"
                                    >
                                      <i className="fas fa-print" />
                                    </button>
                                  </div>
                                  <strong>बिल #{bill.billNo || "—"}</strong> — ₹
                                  {bill.total || 0}
                                  <br />
                                  <small>
                                    {bill.billDate || "—"}
                                    {bill.paymentDate
                                      ? ` | भुगतान: ${bill.paymentDate}`
                                      : ""}
                                  </small>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Modal */}
        {kbEditModal && (
          <div
            className="modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setKbEditModal(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setKbEditModal(false);
            }}
            role="presentation"
            data-ocid="khataBahi.modal"
          >
            <div
              className="modal-content"
              style={{
                maxWidth: "900px",
                maxHeight: "85vh",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h2 style={{ color: "#1b4d3e", margin: 0 }}>
                  <i className="fas fa-edit" /> बिल एडिट करें
                </h2>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    color: "#e76f51",
                  }}
                  onClick={() => setKbEditModal(false)}
                  data-ocid="khataBahi.close_button"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleKbEditSubmit}>
                <datalist id="kb-edit-block-list">
                  {kbBlocks.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <datalist id="kb-edit-panchayat-list">
                  {kbPanchayats.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                <datalist id="kb-edit-customer-list">
                  {kbCustomers.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <datalist id="kb-edit-prs-list">
                  {kbPrsNames.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "15px",
                    marginBottom: "15px",
                    alignItems: "flex-end",
                  }}
                >
                  <div style={formGroupStyle}>
                    <label style={labelStyle} htmlFor="kb-field-10">
                      ब्लॉक
                    </label>
                    <input
                      id="kb-field-10"
                      style={inputStyle}
                      type="text"
                      list="kb-edit-block-list"
                      required
                      value={kbEditBlock}
                      onChange={(e) => setKbEditBlock(e.target.value)}
                      data-ocid="khataBahi.input"
                    />
                  </div>
                  <div style={formGroupStyle}>
                    <label style={labelStyle} htmlFor="kb-field-11">
                      पंचायत
                    </label>
                    <input
                      id="kb-field-11"
                      style={inputStyle}
                      type="text"
                      list="kb-edit-panchayat-list"
                      required
                      value={kbEditPanchayat}
                      onChange={(e) => setKbEditPanchayat(e.target.value)}
                      data-ocid="khataBahi.input"
                    />
                  </div>
                  <div style={formGroupStyle}>
                    <label style={labelStyle} htmlFor="kb-field-12">
                      ग्राहक नाम
                    </label>
                    <input
                      id="kb-field-12"
                      style={inputStyle}
                      type="text"
                      list="kb-edit-customer-list"
                      value={kbEditCustomer}
                      onChange={(e) => setKbEditCustomer(e.target.value)}
                      data-ocid="khataBahi.input"
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "15px",
                    marginBottom: "15px",
                    alignItems: "flex-end",
                  }}
                >
                  <div style={formGroupStyle}>
                    <label style={labelStyle} htmlFor="kb-field-13">
                      बिल नंबर
                    </label>
                    <input
                      id="kb-field-13"
                      style={inputStyle}
                      type="text"
                      value={kbEditBillNo}
                      onChange={(e) => setKbEditBillNo(e.target.value)}
                      data-ocid="khataBahi.input"
                    />
                  </div>
                  <div style={formGroupStyle}>
                    <label style={labelStyle} htmlFor="kb-field-14">
                      बिल दिनांक
                    </label>
                    <input
                      id="kb-field-14"
                      style={inputStyle}
                      type="date"
                      required
                      value={kbEditBillDate}
                      onChange={(e) => setKbEditBillDate(e.target.value)}
                      data-ocid="khataBahi.input"
                    />
                  </div>
                  <div style={formGroupStyle}>
                    <label style={labelStyle} htmlFor="kb-field-15">
                      वर्क कोड
                    </label>
                    <input
                      id="kb-field-15"
                      style={inputStyle}
                      type="text"
                      value={kbEditWorkCode}
                      onChange={(e) => setKbEditWorkCode(e.target.value)}
                      data-ocid="khataBahi.input"
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "15px",
                    marginBottom: "15px",
                    alignItems: "flex-end",
                  }}
                >
                  <div style={formGroupStyle}>
                    <label style={labelStyle} htmlFor="kb-field-16">
                      भुगतान दिनांक
                    </label>
                    <input
                      id="kb-field-16"
                      style={inputStyle}
                      type="date"
                      value={kbEditPaymentDate}
                      onChange={(e) => setKbEditPaymentDate(e.target.value)}
                      data-ocid="khataBahi.input"
                    />
                  </div>
                  <div style={formGroupStyle}>
                    <label style={labelStyle} htmlFor="kb-field-17">
                      P.R.S नाम
                    </label>
                    <input
                      id="kb-field-17"
                      style={inputStyle}
                      type="text"
                      list="kb-edit-prs-list"
                      value={kbEditPrsName}
                      onChange={(e) => setKbEditPrsName(e.target.value)}
                      data-ocid="khataBahi.input"
                    />
                  </div>
                  <div style={formGroupStyle}>
                    <label style={labelStyle} htmlFor="kb-field-18">
                      मोबाइल नंबर
                    </label>
                    <input
                      id="kb-field-18"
                      style={inputStyle}
                      type="tel"
                      value={kbEditMobile}
                      onChange={(e) => setKbEditMobile(e.target.value)}
                      data-ocid="khataBahi.input"
                    />
                  </div>
                </div>

                <div
                  style={{
                    background: "#eaf4e4",
                    borderRadius: "20px",
                    padding: "20px",
                    margin: "15px 0",
                  }}
                >
                  <div
                    style={{
                      ...labelStyle,
                      fontSize: "1.1rem",
                      marginBottom: "12px",
                      display: "block",
                    }}
                  >
                    <i className="fas fa-leaf" /> सामान (पौधे) की सूची
                  </div>
                  {kbEditItems.map((item, idx) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      index={idx}
                      items={kbEditItems}
                      setItems={setKbEditItems}
                      plantList={kbPlantList}
                      ocidPrefix="khataBahi"
                    />
                  ))}
                  <button
                    type="button"
                    style={{
                      background: "#f9c74f",
                      color: "#2d6a4f",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "50px",
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    onClick={() =>
                      setKbEditItems((prev) => [
                        ...prev,
                        {
                          id: Date.now(),
                          plant: "",
                          customPlant: "",
                          qty: "",
                          price: "",
                        },
                      ])
                    }
                    data-ocid="khataBahi.secondary_button"
                  >
                    <i className="fas fa-plus" /> और पौधा जोड़ें
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginTop: "15px",
                  }}
                >
                  <button
                    type="submit"
                    style={{
                      background: "#2d6a4f",
                      color: "white",
                      border: "none",
                      padding: "12px 25px",
                      borderRadius: "50px",
                      fontSize: "1.1rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                    data-ocid="khataBahi.confirm_button"
                  >
                    <i className="fas fa-save" /> अपडेट करें
                  </button>
                  <button
                    type="button"
                    style={{
                      background: "transparent",
                      border: "2px solid #2d6a4f",
                      color: "#2d6a4f",
                      padding: "12px 25px",
                      borderRadius: "50px",
                      fontSize: "1.1rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                    onClick={() => setKbEditModal(false)}
                    data-ocid="khataBahi.cancel_button"
                  >
                    रद्द करें
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
