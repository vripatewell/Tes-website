import { useState, useEffect } from "react";
import axios from "axios";

const paketList = [
  { id: "unlimited", label: "RAM Unlimited", harga: 13000 },
  { id: "1gb", label: "RAM 1GB", harga: 3000 },
  { id: "2gb", label: "RAM 2GB", harga: 4000 },
  { id: "3gb", label: "RAM 3GB", harga: 5000 },
  { id: "4gb", label: "RAM 4GB", harga: 6000 },
  { id: "5gb", label: "RAM 5GB", harga: 7000 },
  { id: "6gb", label: "RAM 6GB", harga: 8000 },
  { id: "7gb", label: "RAM 7GB", harga: 9000 },
  { id: "8gb", label: "RAM 8GB", harga: 10000 },
  { id: "9gb", label: "RAM 9GB", harga: 11000 },
  { id: "10gb", label: "RAM 10GB", harga: 12000 },
];

export default function Home() {
  const [form, setForm] = useState({ username: "", password: "", paket: "" });
  const [step, setStep] = useState(1);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState("");
  const [token, setToken] = useState("");
  const [panelData, setPanelData] = useState([]);
  const [pendingTransactionId, setPendingTransactionId] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const data = JSON.parse(localStorage.getItem("riwayatPanel") || "[]");
      setPanelData(data);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("riwayatPanel", JSON.stringify(panelData));
    }
  }, [panelData]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    setNotif("");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/order", form);
      setQrData(data);
      setPendingTransactionId(data.transactionId);
      setStep(2);
    } catch (err) {
      setNotif("Gagal membuat order. Cek kembali koneksi/API.");
    }
    setLoading(false);
  };

  const handleCheck = async () => {
    setNotif("");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/order", {
        ...form,
        cek: true,
        transactionId: pendingTransactionId,
      });
      if (data.status === "PAID" && data.token) {
        setToken(data.token);
        setStep(3);
        setNotif("");
      } else if (data.status === "PENDING") {
        setNotif("Pembayaran belum terdeteksi, coba ulangi setelah beberapa detik.");
      } else {
        setNotif("Gagal proses pembayaran. Hubungi admin.");
      }
    } catch (err) {
      setNotif("Gagal cek status. Cek koneksi.");
    }
    setLoading(false);
  };

  const handleAmbilPanel = async () => {
    setNotif("");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/order", {
        ambil: true,
        transactionId: pendingTransactionId,
        token,
      });
      if (data.panelInfo) {
        setPanelData((list) => [data.panelInfo, ...list]);
        setStep(4);
      } else {
        setNotif("Token tidak valid atau panel belum dibuat.");
      }
    } catch {
      setNotif("Gagal ambil panel. Coba refresh.");
    }
    setLoading(false);
  };

  const handleReset = () => {
    setForm({ username: "", password: "", paket: "" });
    setStep(1);
    setQrData(null);
    setPendingTransactionId(null);
    setToken("");
    setNotif("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-pink-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-xl w-full">
        <h1 className="text-3xl font-bold mb-2 text-indigo-600">Buy Panel Pterodactyl</h1>
        <p className="mb-6 text-gray-500">Order panel otomatis, data panel bisa diambil langsung setelah pembayaran berhasil!</p>
        
        {notif && <div className="mb-4 text-sm text-red-500">{notif}</div>}
        
        {step === 1 && (
          <form onSubmit={handleOrder} className="space-y-4">
            <input
              name="username"
              required
              placeholder="Username Panel"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none"
              onChange={handleChange}
              value={form.username}
              minLength={4}
            />
            <input
              name="password"
              required
              placeholder="Password Panel"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none"
              onChange={handleChange}
              value={form.password}
              minLength={4}
            />
            <select
              name="paket"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none"
              onChange={handleChange}
              value={form.paket}
            >
              <option value="" disabled>Pilih Paket RAM</option>
              {paketList.map(p => (
                <option key={p.id} value={p.id}>{p.label} ({p.harga.toLocaleString("id-ID", { style: "currency", currency: "IDR" })})</option>
              ))}
            </select>
            <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 w-full py-2 rounded-lg text-white font-bold transition">
              {loading ? "Memproses..." : "Beli Panel"}
            </button>
          </form>
        )}

        {step === 2 && qrData && (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-green-600 mb-2">Bayar Lewat QRIS</h2>
            <img src={qrData.qrImageUrl} className="mx-auto my-4 w-52 rounded-xl shadow" alt="QRIS" />
            <p className="text-lg mb-2 font-bold text-gray-700">Total: Rp {qrData.amount?.toLocaleString()}</p>
            <p className="mb-4 text-gray-500">*Batas waktu: 5 menit*</p>
            <button onClick={handleCheck} disabled={loading} className="bg-green-600 hover:bg-green-700 py-2 px-6 rounded-lg text-white font-bold mt-2">
              {loading ? "Cek Status..." : "Sudah Bayar, Cek Status"}
            </button>
            <button onClick={handleReset} className="block mx-auto mt-4 text-indigo-500">Batal & Ulangi</button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-indigo-700 mb-2">Pembayaran Sukses 🎉</h2>
            <p className="mb-4 text-gray-600">Klik tombol di bawah ini untuk mengambil data panel kamu.</p>
            <button onClick={handleAmbilPanel} className="bg-indigo-600 hover:bg-indigo-700 py-2 px-6 rounded-lg text-white font-bold mt-2">
              Ambil Panel
            </button>
          </div>
        )}

        {step === 4 && panelData.length > 0 && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-green-700 mb-2">Panel Kamu</h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-2 text-left">
              <p><b>Username:</b> {panelData[0].username}</p>
              <p><b>Password:</b> {panelData[0].password}</p>
              <p><b>Login Panel:</b> <a href={panelData[0].domain} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">{panelData[0].domain}</a></p>
              <p className="text-sm mt-2 text-gray-500">Panel juga akan muncul di riwayat bawah ini.</p>
            </div>
            <button onClick={handleReset} className="bg-indigo-600 hover:bg-indigo-700 py-2 px-6 rounded-lg text-white font-bold mt-4">
              Beli Lagi
            </button>
          </div>
        )}

        <div className="mt-6">
          {panelData.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-gray-600 mb-2">Riwayat Panel</h3>
              <ul>
                {panelData.map((panel, idx) => (
                  <li key={idx} className="bg-white border rounded-lg p-4 mb-3 shadow text-sm">
                    <b>{panel.username}</b> / {panel.password}<br />
                    <span className="text-xs text-gray-400">Panel: <a href={panel.domain} className="text-blue-500 underline">{panel.domain}</a></span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}