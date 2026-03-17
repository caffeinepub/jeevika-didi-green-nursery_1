import { useCallback, useEffect, useState } from "react";
import type { Bill } from "./backend";
import type { backendInterface } from "./backend";
import { createActorWithConfig } from "./config";

// ─── Constants ───────────────────────────────────────────────────────────────

const PLANT_LIST = [
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

interface PlantItem {
  plant: string;
  customPlant: string;
  quantity: number;
  price: number;
}

interface ParsedItem {
  plant: string;
  quantity: number;
  price: number;
  subtotal: number;
}

function emptyItem(): PlantItem {
  return { plant: "", customPlant: "", quantity: 1, price: 0 };
}

const today = new Date().toISOString().split("T")[0];

// ─── Print helpers ────────────────────────────────────────────────────────────

function printSingleBill(bill: Bill) {
  const items: ParsedItem[] = JSON.parse(bill.itemsJson || "[]");
  const itemsRows = items
    .map(
      (it) =>
        `<tr><td>${it.plant}</td><td>${it.quantity}</td><td>₹${it.price}</td><td>₹${(it.quantity * it.price).toFixed(0)}</td></tr>`,
    )
    .join("");
  const printDate = new Date().toLocaleDateString("hi-IN");
  const html = `<html><head><title>बिल #${bill.billNo}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:8px;text-align:left}th{background:#2b5e2b;color:white}@media print{button{display:none}}</style></head>
    <body>
      <div style="text-align:center;margin-bottom:16px"><h2>जीविका दीदी ग्रीन नर्सरी</h2><p>पूर्वी चंपारण, बिहार - 845401 | मो: 9504800073</p><hr></div>
      <h3>बिल #${bill.billNo || "—"} की रसीद</h3>
      <table><tr><td><b>ब्लॉक:</b> ${bill.block}</td><td><b>पंचायत:</b> ${bill.panchayat}</td></tr>
      <tr><td><b>ग्राहक:</b> ${bill.customerName}</td><td><b>P.R.S:</b> ${bill.prsName}</td></tr>
      <tr><td><b>मोबाइल:</b> ${bill.mobile}</td><td><b>बिल दिनांक:</b> ${bill.billDate}</td></tr>
      <tr><td><b>वर्क कोड:</b> ${bill.workCode}</td><td><b>भुगतान:</b> ${bill.paymentDate || "—"}</td></tr></table>
      <h4 style="margin-top:16px">पौधों की सूची:</h4>
      <table><thead><tr><th>पौधे का नाम</th><th>मात्रा</th><th>दर (₹)</th><th>कुल (₹)</th></tr></thead>
      <tbody>${itemsRows}<tr style="background:#f9c74f;font-weight:bold"><td colspan="3" style="text-align:right">कुल योग</td><td>₹${bill.total}</td></tr></tbody></table>
      <div style="margin-top:50px;display:flex;justify-content:space-between">
        <div style="text-align:center"><div style="width:200px;border-bottom:2px solid #333"></div><p>ग्राहक के हस्ताक्षर</p></div>
        <div style="text-align:center"><div style="width:200px;border-bottom:2px solid #333"></div><p>विक्रेता के हस्ताक्षर</p></div>
        <div><p>दिनांक: ${printDate}</p></div>
      </div>
      <div style="text-align:center;margin-top:20px"><button type="button" onclick="window.print()">प्रिंट करें</button> <button type="button" onclick="window.close()">बंद करें</button></div>
    </body></html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function printLocationLedger(block: string, panchayat: string, bills: Bill[]) {
  const locationBills = bills
    .filter((b) => b.block === block && b.panchayat === panchayat)
    .sort((a, b) => (a.billDate || "").localeCompare(b.billDate || ""));
  if (!locationBills.length) return;
  let grandTotal = 0;
  let rows = "";
  for (const t of locationBills) {
    grandTotal += t.total;
    const items: ParsedItem[] = JSON.parse(t.itemsJson || "[]");
    rows += `<tr class="bill-sep"><td colspan="8" style="background:#d4e6c3;font-weight:bold">बिल: ${t.billNo || "—"} | दिनांक: ${t.billDate} | ग्राहक: ${t.customerName}</td></tr>`;
    rows += `<tr><td>${t.customerName}</td><td>${t.block}</td><td>${t.panchayat}</td><td>${t.prsName}</td><td>${t.mobile}</td><td>${t.workCode}</td><td>${t.paymentDate || "—"}</td><td>${t.billNo}</td></tr>`;
    rows += `<tr style="background:#e1f0d8"><th colspan="2">पौधे का नाम</th><th>मात्रा</th><th>दर</th><th>कुल</th><th colspan="3"></th></tr>`;
    for (const it of items) {
      rows += `<tr><td colspan="2">${it.plant}</td><td>${it.quantity}</td><td>₹${it.price}</td><td>₹${(it.quantity * it.price).toFixed(0)}</td><td colspan="3"></td></tr>`;
    }
    rows += `<tr style="border-top:2px solid #2d6a4f;background:#f5f5dc"><td colspan="4" style="text-align:right"><b>इस बिल का योग</b></td><td><b>₹${t.total}</b></td><td colspan="3"></td></tr>`;
  }
  rows += `<tr style="background:#f9c74f;font-weight:bold"><td colspan="4" style="text-align:right;font-size:1.1rem">सभी बिलों का कुल योग</td><td colspan="4" style="font-size:1.1rem">₹${grandTotal}</td></tr>`;
  const html = `<html><head><title>${block} - ${panchayat} खाता</title>
    <style>body{font-family:Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:8px;text-align:left}th{background:#2b5e2b;color:white}@media print{button{display:none}}</style></head>
    <body><h2 style="color:#2b5e2b;border-bottom:2px solid #2b5e2b">${block} - ${panchayat} का विस्तृत खाता</h2>
    <p><b>कुल बिल:</b> ${locationBills.length} | <b>कुल राशि:</b> ₹${grandTotal}</p>
    <table><thead><tr><th>ग्राहक नाम</th><th>ब्लॉक</th><th>पंचायत</th><th>P.R.S नाम</th><th>मोबाइल</th><th>वर्क कोड</th><th>भुगतान तिथि</th><th>बिल नं.</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div style="margin-top:50px;display:flex;justify-content:space-between">
      <div style="text-align:center"><div style="width:200px;border-bottom:2px solid #333"></div><p>ग्राहक के हस्ताक्षर</p></div>
      <div style="text-align:center"><div style="width:200px;border-bottom:2px solid #333"></div><p>विक्रेता के हस्ताक्षर</p></div>
    </div>
    <div style="text-align:center;margin-top:20px"><button type="button" onclick="window.print()">प्रिंट करें</button> <button type="button" onclick="window.close()">बंद करें</button></div>
    </body></html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlantItemRow({
  item,
  index,
  onChange,
  onRemove,
  prefix,
}: {
  item: PlantItem;
  index: number;
  onChange: (index: number, updated: PlantItem) => void;
  onRemove: (index: number) => void;
  prefix: string;
}) {
  const isOther = item.plant === "OTHER";
  return (
    <div className="item-row">
      <div>
        <select
          className="form-select"
          style={{ width: "100%" }}
          data-ocid={`${prefix}.item.${index + 1}`}
          value={item.plant}
          onChange={(e) =>
            onChange(index, { ...item, plant: e.target.value, customPlant: "" })
          }
          required
        >
          <option value="">-- पौधा चुनें --</option>
          {PLANT_LIST.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value="OTHER">✨ अन्य (नया नाम)</option>
        </select>
        {isOther && (
          <input
            type="text"
            className="form-input"
            style={{ width: "100%", marginTop: "4px" }}
            placeholder="नए पौधे का नाम लिखें"
            value={item.customPlant}
            onChange={(e) =>
              onChange(index, { ...item, customPlant: e.target.value })
            }
            required
          />
        )}
      </div>
      <input
        type="number"
        className="form-input"
        placeholder="मात्रा"
        min={1}
        value={item.quantity}
        onChange={(e) =>
          onChange(index, {
            ...item,
            quantity: Number.parseInt(e.target.value) || 1,
          })
        }
        required
      />
      <input
        type="number"
        className="form-input"
        placeholder="कीमत"
        min={0}
        step={1}
        value={item.price}
        onChange={(e) =>
          onChange(index, {
            ...item,
            price: Number.parseFloat(e.target.value) || 0,
          })
        }
        required
      />
      <button
        type="button"
        className="remove-btn"
        onClick={() => onRemove(index)}
        title="हटाएं"
        data-ocid={`${prefix}.delete_button.${index + 1}`}
      >
        <i className="fas fa-trash" />
      </button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [actor, setActor] = useState<backendInterface | null>(null);
  const [activeSection, setActiveSection] = useState("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollVisible, setScrollVisible] = useState(false);

  // Ledger state
  const [bills, setBills] = useState<Bill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsError, setBillsError] = useState("");

  // Add bill form
  const [formData, setFormData] = useState({
    block: "",
    panchayat: "",
    customerName: "",
    billNo: "",
    billDate: today,
    workCode: "",
    paymentDate: "",
    prsName: "",
    mobile: "",
  });
  const [formItems, setFormItems] = useState<PlantItem[]>([emptyItem()]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editData, setEditData] = useState({
    block: "",
    panchayat: "",
    customerName: "",
    billNo: "",
    billDate: "",
    workCode: "",
    paymentDate: "",
    prsName: "",
    mobile: "",
  });
  const [editItems, setEditItems] = useState<PlantItem[]>([emptyItem()]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Search
  const [searchBlock, setSearchBlock] = useState("");
  const [searchPanchayat, setSearchPanchayat] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [activeSearch, setActiveSearch] = useState({
    block: "",
    panchayat: "",
    customer: "",
  });

  // Ledger detail
  const [detailLocation, setDetailLocation] = useState<{
    block: string;
    panchayat: string;
  } | null>(null);

  // ── Scroll top ──
  useEffect(() => {
    createActorWithConfig().then(setActor).catch(console.error);
  }, []);

  useEffect(() => {
    const handler = () => setScrollVisible(window.scrollY > 300);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // ── Load bills ──
  const loadBills = useCallback(async () => {
    setBillsLoading(true);
    setBillsError("");
    try {
      const data = await actor!.getAllBills();
      setBills(data);
    } catch {
      setBillsError("डेटा लोड नहीं हो सका। कृपया पुनः प्रयास करें।");
    } finally {
      setBillsLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (isLoggedIn) loadBills();
  }, [isLoggedIn, loadBills]);

  // ── Login ──
  function handleLogin() {
    if (
      loginUsername === "jeevikadidigreennursery" &&
      loginPassword === "Jeevika"
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

  // ── Nav ──
  function navigate(section: string) {
    if (section === "ledger" && !isLoggedIn) {
      setShowLoginModal(true);
    } else {
      setActiveSection(section);
    }
    setMenuOpen(false);
  }

  // ── Add bill ──
  async function handleAddBill(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.block || !formData.panchayat) {
      alert("ब्लॉक और पंचायत का नाम भरें।");
      return;
    }
    if (formItems.length === 0) {
      alert("कम से कम एक पौधा जोड़ें।");
      return;
    }
    const items: ParsedItem[] = [];
    let totalAmount = 0;
    for (const row of formItems) {
      const plantName =
        row.plant === "OTHER" ? row.customPlant.trim() : row.plant;
      if (!plantName || !row.quantity || !row.price) {
        alert("सभी पौधों की जानकारी भरें।");
        return;
      }
      const subtotal = row.quantity * row.price;
      items.push({
        plant: plantName,
        quantity: row.quantity,
        price: row.price,
        subtotal,
      });
      totalAmount += subtotal;
    }
    setFormSubmitting(true);
    try {
      await actor!.addBill(
        formData.block,
        formData.panchayat,
        formData.customerName,
        formData.billNo,
        formData.billDate,
        formData.workCode,
        formData.paymentDate,
        formData.prsName,
        formData.mobile,
        JSON.stringify(items),
        totalAmount,
      );
      setFormData({
        block: "",
        panchayat: "",
        customerName: "",
        billNo: "",
        billDate: today,
        workCode: "",
        paymentDate: "",
        prsName: "",
        mobile: "",
      });
      setFormItems([emptyItem()]);
      await loadBills();
      alert("बिल सेव हो गया!");
    } catch {
      alert("बिल सेव नहीं हो सका। कृपया पुनः प्रयास करें।");
    } finally {
      setFormSubmitting(false);
    }
  }

  // ── Edit bill open ──
  function openEditBill(bill: Bill) {
    setEditingBill(bill);
    setEditData({
      block: bill.block,
      panchayat: bill.panchayat,
      customerName: bill.customerName,
      billNo: bill.billNo,
      billDate: bill.billDate,
      workCode: bill.workCode,
      paymentDate: bill.paymentDate,
      prsName: bill.prsName,
      mobile: bill.mobile,
    });
    const parsedItems: ParsedItem[] = JSON.parse(bill.itemsJson || "[]");
    setEditItems(
      parsedItems.map((it) => ({
        plant: PLANT_LIST.includes(it.plant) ? it.plant : "OTHER",
        customPlant: PLANT_LIST.includes(it.plant) ? "" : it.plant,
        quantity: it.quantity,
        price: it.price,
      })),
    );
    setShowEditModal(true);
  }

  // ── Update bill ──
  async function handleUpdateBill(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBill) return;
    const items: ParsedItem[] = [];
    let totalAmount = 0;
    for (const row of editItems) {
      const plantName =
        row.plant === "OTHER" ? row.customPlant.trim() : row.plant;
      if (!plantName || !row.quantity || !row.price) {
        alert("सभी पौधों की जानकारी भरें।");
        return;
      }
      const subtotal = row.quantity * row.price;
      items.push({
        plant: plantName,
        quantity: row.quantity,
        price: row.price,
        subtotal,
      });
      totalAmount += subtotal;
    }
    setEditSubmitting(true);
    try {
      await actor!.updateBill(
        editingBill.id,
        editData.block,
        editData.panchayat,
        editData.customerName,
        editData.billNo,
        editData.billDate,
        editData.workCode,
        editData.paymentDate,
        editData.prsName,
        editData.mobile,
        JSON.stringify(items),
        totalAmount,
        editingBill.timestamp,
      );
      setShowEditModal(false);
      setEditingBill(null);
      await loadBills();
      alert("बिल अपडेट हो गया!");
    } catch {
      alert("बिल अपडेट नहीं हो सका।");
    } finally {
      setEditSubmitting(false);
    }
  }

  // ── Delete bill ──
  async function handleDeleteBill(id: bigint) {
    if (!confirm("क्या आप वाकई इस बिल को डिलीट करना चाहते हैं?")) return;
    try {
      await actor!.deleteBill(id);
      await loadBills();
    } catch {
      alert("डिलीट नहीं हो सका।");
    }
  }

  // ── Delete location ──
  async function handleDeleteLocation(block: string, panchayat: string) {
    if (!confirm(`क्या आप ${block} - ${panchayat} के सभी बिल डिलीट करना चाहते हैं?`))
      return;
    const locationBills = bills.filter(
      (b) => b.block === block && b.panchayat === panchayat,
    );
    try {
      await Promise.all(locationBills.map((b) => actor!.deleteBill(b.id)));
      await loadBills();
      if (
        detailLocation?.block === block &&
        detailLocation?.panchayat === panchayat
      ) {
        setDetailLocation(null);
      }
    } catch {
      alert("डिलीट नहीं हो सका।");
    }
  }

  // ── Computed ──
  const filteredBills = bills.filter((b) => {
    const { block, panchayat, customer } = activeSearch;
    return (
      (!block || b.block.toLowerCase().includes(block.toLowerCase())) &&
      (!panchayat ||
        b.panchayat.toLowerCase().includes(panchayat.toLowerCase())) &&
      (!customer ||
        b.customerName.toLowerCase().includes(customer.toLowerCase()))
    );
  });

  const locationMap = new Map<
    string,
    {
      block: string;
      panchayat: string;
      bills: Bill[];
      customers: Set<string>;
      total: number;
    }
  >();
  for (const b of filteredBills) {
    const key = `${b.block}|${b.panchayat}`;
    if (!locationMap.has(key)) {
      locationMap.set(key, {
        block: b.block,
        panchayat: b.panchayat,
        bills: [],
        customers: new Set(),
        total: 0,
      });
    }
    const loc = locationMap.get(key)!;
    loc.bills.push(b);
    if (b.customerName) loc.customers.add(b.customerName);
    loc.total += b.total;
  }

  const uniqueBlocks = [...new Set(bills.map((b) => b.block).filter(Boolean))];
  const uniquePanchayats = [
    ...new Set(bills.map((b) => b.panchayat).filter(Boolean)),
  ];
  const uniqueCustomers = [
    ...new Set(bills.map((b) => b.customerName).filter(Boolean)),
  ];

  // ── Render Sections ──

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

    return (
      <div className="section">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            <i className="fas fa-book" /> 📒 ब्लॉक/पंचायत वार खाता बही
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

        {/* Add Bill Form */}
        <div className="ledger-form-card">
          <h2>
            <i className="fas fa-plus-circle" /> नया बिल जोड़ें
          </h2>
          <form onSubmit={handleAddBill}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="field-1">
                  ब्लॉक <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  id="field-1"
                  type="text"
                  className="form-input"
                  list="blockList"
                  placeholder="ब्लॉक का नाम"
                  required
                  value={formData.block}
                  onChange={(e) =>
                    setFormData({ ...formData, block: e.target.value })
                  }
                  data-ocid="ledger.block.input"
                />
                <datalist id="blockList">
                  {uniqueBlocks.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label htmlFor="field-2">
                  पंचायत <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  id="field-2"
                  type="text"
                  className="form-input"
                  list="panchayatList"
                  placeholder="पंचायत का नाम"
                  required
                  value={formData.panchayat}
                  onChange={(e) =>
                    setFormData({ ...formData, panchayat: e.target.value })
                  }
                  data-ocid="ledger.panchayat.input"
                />
                <datalist id="panchayatList">
                  {uniquePanchayats.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label htmlFor="field-3">ग्राहक नाम</label>
                <input
                  id="field-3"
                  type="text"
                  className="form-input"
                  list="customerList"
                  placeholder="वैकल्पिक"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  data-ocid="ledger.customer.input"
                />
                <datalist id="customerList">
                  {uniqueCustomers.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="field-4">बिल नंबर</label>
                <input
                  id="field-4"
                  type="text"
                  className="form-input"
                  placeholder="बिल नं."
                  value={formData.billNo}
                  onChange={(e) =>
                    setFormData({ ...formData, billNo: e.target.value })
                  }
                  data-ocid="ledger.billno.input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="billDate">
                  बिल दिनांक <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  id="billDate"
                  type="date"
                  className="form-input"
                  required
                  value={formData.billDate}
                  onChange={(e) =>
                    setFormData({ ...formData, billDate: e.target.value })
                  }
                  data-ocid="ledger.billdate.input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="field-5">वर्क कोड</label>
                <input
                  id="field-5"
                  type="text"
                  className="form-input"
                  placeholder="वर्क कोड"
                  value={formData.workCode}
                  onChange={(e) =>
                    setFormData({ ...formData, workCode: e.target.value })
                  }
                  data-ocid="ledger.workcode.input"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="paymentDate">भुगतान दिनांक</label>
                <input
                  id="paymentDate"
                  type="date"
                  className="form-input"
                  value={formData.paymentDate}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentDate: e.target.value })
                  }
                  data-ocid="ledger.paymentdate.input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="field-6">P.R.S नाम</label>
                <input
                  id="field-6"
                  type="text"
                  className="form-input"
                  list="prsList"
                  placeholder="P.R.S नाम"
                  value={formData.prsName}
                  onChange={(e) =>
                    setFormData({ ...formData, prsName: e.target.value })
                  }
                  data-ocid="ledger.prs.input"
                />
                <datalist id="prsList">
                  {[
                    ...new Set(bills.map((b) => b.prsName).filter(Boolean)),
                  ].map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label htmlFor="field-7">मोबाइल नंबर</label>
                <input
                  id="field-7"
                  type="tel"
                  className="form-input"
                  placeholder="98xxxxxx"
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile: e.target.value })
                  }
                  data-ocid="ledger.mobile.input"
                />
              </div>
            </div>

            {/* Plant items */}
            <div className="items-section">
              <div className="items-section-title">
                <i className="fas fa-leaf" /> पौधों की सूची
              </div>
              {formItems.map((item, i) => (
                <PlantItemRow
                  key={`form-${i}-${item.plant}`}
                  item={item}
                  index={i}
                  prefix="ledger.plant"
                  onChange={(idx, updated) => {
                    setFormItems((prev) =>
                      prev.map((it, j) => (j === idx ? updated : it)),
                    );
                  }}
                  onRemove={(idx) =>
                    setFormItems((prev) => prev.filter((_, j) => j !== idx))
                  }
                />
              ))}
              <button
                type="button"
                className="btn"
                style={{
                  background: "var(--secondary)",
                  color: "var(--dark-green)",
                  marginTop: "0.5rem",
                }}
                onClick={() => setFormItems((prev) => [...prev, emptyItem()])}
                data-ocid="ledger.add.button"
              >
                <i className="fas fa-plus" /> और पौधा जोड़ें
              </button>
            </div>

            <button
              type="submit"
              className="btn"
              disabled={formSubmitting}
              data-ocid="ledger.submit_button"
            >
              {formSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin" /> सेव हो रहा है...
                </>
              ) : (
                <>
                  <i className="fas fa-save" /> बिल सेव करें
                </>
              )}
            </button>
          </form>
        </div>

        {/* Search */}
        <div className="search-section">
          <h3>
            <i className="fas fa-search" /> ब्लॉक / पंचायत से खोजें
          </h3>
          <div className="search-row">
            <input
              type="text"
              className="form-input"
              list="blockList2"
              placeholder="ब्लॉक से खोजें"
              value={searchBlock}
              onChange={(e) => setSearchBlock(e.target.value)}
              data-ocid="ledger.search_input"
            />
            <datalist id="blockList2">
              {uniqueBlocks.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
            <input
              type="text"
              className="form-input"
              list="panchayatList2"
              placeholder="पंचायत से खोजें"
              value={searchPanchayat}
              onChange={(e) => setSearchPanchayat(e.target.value)}
            />
            <datalist id="panchayatList2">
              {uniquePanchayats.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <input
              type="text"
              className="form-input"
              placeholder="ग्राहक नाम से"
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
            />
            <button
              type="button"
              className="btn"
              onClick={() =>
                setActiveSearch({
                  block: searchBlock,
                  panchayat: searchPanchayat,
                  customer: searchCustomer,
                })
              }
              data-ocid="ledger.primary_button"
            >
              <i className="fas fa-search" /> खोजें
            </button>
            <button
              type="button"
              className="btn"
              style={{
                background: "var(--secondary)",
                color: "var(--dark-green)",
              }}
              onClick={() => {
                setSearchBlock("");
                setSearchPanchayat("");
                setSearchCustomer("");
                setActiveSearch({ block: "", panchayat: "", customer: "" });
              }}
              data-ocid="ledger.secondary_button"
            >
              रीसेट
            </button>
          </div>
        </div>

        {/* Loading / Error */}
        {billsLoading && (
          <div className="spinner">
            <div className="spinner-icon" />
          </div>
        )}
        {billsError && (
          <div className="error-msg" data-ocid="ledger.error_state">
            {billsError}
          </div>
        )}

        {/* Location cards */}
        {!billsLoading && (
          <div className="location-cards-grid" data-ocid="ledger.list">
            {locationMap.size === 0 ? (
              <p
                style={{ color: "#888", fontSize: "0.9rem" }}
                data-ocid="ledger.empty_state"
              >
                कोई डेटा नहीं मिला।
              </p>
            ) : (
              Array.from(locationMap.values()).map((loc, idx) => (
                <div
                  className="location-card"
                  key={`${loc.block}|${loc.panchayat}`}
                  data-ocid={`ledger.item.${idx + 1}`}
                >
                  <div className="location-card-header">
                    <div>
                      <h3>{loc.block || "—"}</h3>
                      <h4>
                        <i
                          className="fas fa-map-marker-alt"
                          style={{ marginRight: "4px" }}
                        />
                        {loc.panchayat || "—"}
                      </h4>
                    </div>
                    <div className="location-card-actions">
                      <button
                        type="button"
                        className="icon-btn edit"
                        title="एडिट करें"
                        data-ocid={`ledger.edit_button.${idx + 1}`}
                        onClick={() => {
                          const latest = [...loc.bills].sort((a, b) =>
                            (b.billDate || "").localeCompare(a.billDate || ""),
                          )[0];
                          if (latest) openEditBill(latest);
                        }}
                      >
                        <i className="fas fa-edit" />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="डिलीट करें"
                        data-ocid={`ledger.delete_button.${idx + 1}`}
                        onClick={() =>
                          handleDeleteLocation(loc.block, loc.panchayat)
                        }
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                  <div className="location-card-stats">
                    <span>
                      <i className="fas fa-users" /> ग्राहक: {loc.customers.size}
                    </span>
                    <span>
                      <i className="fas fa-file-invoice" /> बिल:{" "}
                      {loc.bills.length}
                    </span>
                    <span>
                      <i className="fas fa-rupee-sign" /> ₹
                      {loc.total.toFixed(0)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="badge-view"
                    onClick={() =>
                      setDetailLocation({
                        block: loc.block,
                        panchayat: loc.panchayat,
                      })
                    }
                  >
                    <i className="fas fa-eye" /> क्षेत्र का खाता देखें
                  </button>

                  {/* Customer list */}
                  <div className="customer-list">
                    <div className="customer-list-title">
                      <i className="fas fa-user" /> ग्राहक:
                    </div>
                    {Array.from(
                      loc.bills.reduce((acc, bill) => {
                        const name = bill.customerName || "अज्ञात";
                        if (!acc.has(name))
                          acc.set(name, { total: 0, bills: [] as Bill[] });
                        acc.get(name)!.total += bill.total;
                        acc.get(name)!.bills.push(bill);
                        return acc;
                      }, new Map<string, { total: number; bills: Bill[] }>()),
                    ).map(([name, data]) => (
                      <div className="customer-item" key={name}>
                        <div className="customer-name">
                          {name} — ₹{data.total.toFixed(0)} ({data.bills.length}{" "}
                          बिल)
                        </div>
                        {data.bills
                          .sort((a, b) =>
                            (b.billDate || "").localeCompare(a.billDate || ""),
                          )
                          .map((bill, bi) => (
                            <div className="bill-item" key={String(bill.id)}>
                              <div className="bill-item-info">
                                <strong>बिल #{bill.billNo || "—"}</strong> — ₹
                                {bill.total.toFixed(0)}
                                <span
                                  style={{
                                    marginLeft: "0.4rem",
                                    color: "#777",
                                  }}
                                >
                                  {bill.billDate}
                                </span>
                              </div>
                              <div className="bill-item-actions">
                                <button
                                  type="button"
                                  className="icon-btn edit"
                                  title="एडिट"
                                  onClick={() => openEditBill(bill)}
                                  data-ocid={`ledger.edit_button.${bi + 1}`}
                                >
                                  <i className="fas fa-edit" />
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn danger"
                                  title="डिलीट"
                                  onClick={() => handleDeleteBill(bill.id)}
                                  data-ocid={`ledger.delete_button.${bi + 1}`}
                                >
                                  <i className="fas fa-trash" />
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  title="प्रिंट"
                                  onClick={() => printSingleBill(bill)}
                                  style={{ color: "#555" }}
                                >
                                  <i className="fas fa-print" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Ledger detail */}
        {detailLocation &&
          (() => {
            const { block, panchayat } = detailLocation;
            const detailBills = bills
              .filter((b) => b.block === block && b.panchayat === panchayat)
              .sort((a, b) =>
                (a.billDate || "").localeCompare(b.billDate || ""),
              );
            const grandTotal = detailBills.reduce((s, b) => s + b.total, 0);
            return (
              <div className="ledger-detail" data-ocid="ledger.panel">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <h3 style={{ color: "var(--primary)" }}>
                    {block} - {panchayat} का विस्तृत खाता
                  </h3>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        printLocationLedger(block, panchayat, bills)
                      }
                      data-ocid="ledger.primary_button"
                    >
                      <i className="fas fa-print" /> प्रिंट करें
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setDetailLocation(null)}
                      data-ocid="ledger.close_button"
                    >
                      <i className="fas fa-times" /> बंद करें
                    </button>
                  </div>
                </div>
                <p style={{ marginBottom: "1rem", color: "#555" }}>
                  <strong>कुल बिल:</strong> {detailBills.length} |{" "}
                  <strong>कुल राशि:</strong> ₹{grandTotal.toFixed(0)}
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th>ग्राहक नाम</th>
                        <th>ब्लॉक</th>
                        <th>पंचायत</th>
                        <th>P.R.S नाम</th>
                        <th>मोबाइल</th>
                        <th>वर्क कोड</th>
                        <th>भुगतान तिथि</th>
                        <th>बिल नं.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailBills.map((t) => {
                        const items: ParsedItem[] = JSON.parse(
                          t.itemsJson || "[]",
                        );
                        return (
                          <>
                            <tr
                              key={`sep-${String(t.id)}`}
                              className="bill-separator"
                            >
                              <td colSpan={8}>
                                बिल: {t.billNo || "—"} | दिनांक: {t.billDate} |
                                ग्राहक: {t.customerName}
                              </td>
                            </tr>
                            <tr key={`info-${String(t.id)}`}>
                              <td>{t.customerName}</td>
                              <td>{t.block}</td>
                              <td>{t.panchayat}</td>
                              <td>{t.prsName}</td>
                              <td>{t.mobile}</td>
                              <td>{t.workCode}</td>
                              <td>{t.paymentDate || "—"}</td>
                              <td>{t.billNo}</td>
                            </tr>
                            <tr
                              key={`hdr-${String(t.id)}`}
                              style={{ background: "#e1f0d8" }}
                            >
                              <th colSpan={2}>पौधे का नाम</th>
                              <th>मात्रा</th>
                              <th>दर (₹)</th>
                              <th>कुल (₹)</th>
                              <th colSpan={3} />
                            </tr>
                            {items.map((it, ii) => (
                              <tr key={`item-${String(t.id)}-${ii}`}>
                                <td colSpan={2}>{it.plant}</td>
                                <td>{it.quantity}</td>
                                <td>₹{it.price}</td>
                                <td>₹{(it.quantity * it.price).toFixed(0)}</td>
                                <td colSpan={3} />
                              </tr>
                            ))}
                            <tr
                              key={`total-${String(t.id)}`}
                              style={{
                                borderTop: "2px solid #2d6a4f",
                                background: "#f5f5dc",
                              }}
                            >
                              <td colSpan={4} style={{ textAlign: "right" }}>
                                <strong>इस बिल का योग</strong>
                              </td>
                              <td>
                                <strong>₹{t.total.toFixed(0)}</strong>
                              </td>
                              <td colSpan={3} />
                            </tr>
                          </>
                        );
                      })}
                      <tr className="grand-total-row">
                        <td colSpan={4} style={{ textAlign: "right" }}>
                          सभी बिलों का कुल योग
                        </td>
                        <td colSpan={4}>₹{grandTotal.toFixed(0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
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
            <button
              type="button"
              className="btn-ledger"
              onClick={() => navigate("ledger")}
              data-ocid="nav.ledger.button"
            >
              📒 खाता बही
            </button>
            {isLoggedIn && (
              <button
                type="button"
                className="btn-logout"
                onClick={handleLogout}
                data-ocid="nav.logout.button"
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
          <button
            type="button"
            className="btn-ledger"
            onClick={() => navigate("ledger")}
            style={{ alignSelf: "flex-start" }}
            data-ocid="nav.mobile.ledger.button"
          >
            📒 खाता बही
          </button>
          {isLoggedIn && (
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

      {/* Edit Bill Modal */}
      {showEditModal && editingBill && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowEditModal(false);
          }}
          role="presentation"
          data-ocid="edit.modal"
        >
          <div className="modal-content large">
            <div className="modal-title">
              <i className="fas fa-edit" /> बिल एडिट करें
            </div>
            <form onSubmit={handleUpdateBill}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="field-8">
                    ब्लॉक <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    id="field-8"
                    type="text"
                    className="form-input"
                    required
                    value={editData.block}
                    onChange={(e) =>
                      setEditData({ ...editData, block: e.target.value })
                    }
                    data-ocid="edit.block.input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editPanchayat">
                    पंचायत <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    id="editPanchayat"
                    type="text"
                    className="form-input"
                    required
                    value={editData.panchayat}
                    onChange={(e) =>
                      setEditData({ ...editData, panchayat: e.target.value })
                    }
                    data-ocid="edit.panchayat.input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="field-9">ग्राहक नाम</label>
                  <input
                    id="field-9"
                    type="text"
                    className="form-input"
                    value={editData.customerName}
                    onChange={(e) =>
                      setEditData({ ...editData, customerName: e.target.value })
                    }
                    data-ocid="edit.customer.input"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="editBillNo">बिल नंबर</label>
                  <input
                    id="editBillNo"
                    type="text"
                    className="form-input"
                    value={editData.billNo}
                    onChange={(e) =>
                      setEditData({ ...editData, billNo: e.target.value })
                    }
                    data-ocid="edit.billno.input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="field-10">
                    बिल दिनांक <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    id="field-10"
                    type="date"
                    className="form-input"
                    required
                    value={editData.billDate}
                    onChange={(e) =>
                      setEditData({ ...editData, billDate: e.target.value })
                    }
                    data-ocid="edit.billdate.input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editWorkCode">वर्क कोड</label>
                  <input
                    id="editWorkCode"
                    type="text"
                    className="form-input"
                    value={editData.workCode}
                    onChange={(e) =>
                      setEditData({ ...editData, workCode: e.target.value })
                    }
                    data-ocid="edit.workcode.input"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="field-11">भुगतान दिनांक</label>
                  <input
                    id="field-11"
                    type="date"
                    className="form-input"
                    value={editData.paymentDate}
                    onChange={(e) =>
                      setEditData({ ...editData, paymentDate: e.target.value })
                    }
                    data-ocid="edit.paymentdate.input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editPrsName">P.R.S नाम</label>
                  <input
                    id="editPrsName"
                    type="text"
                    className="form-input"
                    value={editData.prsName}
                    onChange={(e) =>
                      setEditData({ ...editData, prsName: e.target.value })
                    }
                    data-ocid="edit.prs.input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="field-12">मोबाइल नंबर</label>
                  <input
                    id="field-12"
                    type="tel"
                    className="form-input"
                    value={editData.mobile}
                    onChange={(e) =>
                      setEditData({ ...editData, mobile: e.target.value })
                    }
                    data-ocid="edit.mobile.input"
                  />
                </div>
              </div>

              <div className="items-section">
                <div className="items-section-title">
                  <i className="fas fa-leaf" /> पौधों की सूची
                </div>
                {editItems.map((item, i) => (
                  <PlantItemRow
                    key={`edit-${i}-${item.plant}`}
                    item={item}
                    index={i}
                    prefix="edit.plant"
                    onChange={(idx, updated) => {
                      setEditItems((prev) =>
                        prev.map((it, j) => (j === idx ? updated : it)),
                      );
                    }}
                    onRemove={(idx) =>
                      setEditItems((prev) => prev.filter((_, j) => j !== idx))
                    }
                  />
                ))}
                <button
                  type="button"
                  className="btn"
                  style={{
                    background: "var(--secondary)",
                    color: "var(--dark-green)",
                    marginTop: "0.5rem",
                  }}
                  onClick={() => setEditItems((prev) => [...prev, emptyItem()])}
                  data-ocid="edit.add.button"
                >
                  <i className="fas fa-plus" /> और पौधा जोड़ें
                </button>
              </div>

              <div
                style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
              >
                <button
                  type="submit"
                  className="btn"
                  disabled={editSubmitting}
                  data-ocid="edit.confirm_button"
                >
                  {editSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin" /> अपडेट हो रहा है...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save" /> अपडेट करें
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ background: "#e76f51" }}
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBill(null);
                  }}
                  data-ocid="edit.cancel_button"
                >
                  <i className="fas fa-times" /> रद्द करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
