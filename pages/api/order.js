import axios from "axios";
import crypto from "crypto";

const apibot1 = process.env.APIBOT1 || "https://rikishopreal.my.id";
const apiSimpleBotv2 = process.env.APISIMPLEBOTV2 || "rikibtz01";
const merchantIdOrderKuota = process.env.MERCHANT_ID || "_";
const apiOrderKuota = process.env.API_ORDERKUOTA || "_";
const qrisOrderKuota = process.env.QRIS_ORDERKUOTA || "_";
const eggV3 = process.env.EGGV3 || "15";
const nestidV3 = process.env.NESTIDV3 || "5";
const locV3 = process.env.LOCV3 || "1";
const domainV3 = process.env.DOMAINV3 || "_";
const apikeyV3 = process.env.APIKEYV3 || "_";

const paketObj = {
  "unlimited": { ram: "0", disk: "0", cpu: "0", harga: 13000 },
  "1gb": { ram: "1000", disk: "1000", cpu: "40", harga: 3000 },
  "2gb": { ram: "2000", disk: "1000", cpu: "60", harga: 4000 },
  "3gb": { ram: "3000", disk: "2000", cpu: "80", harga: 5000 },
  "4gb": { ram: "4000", disk: "2000", cpu: "100", harga: 6000 },
  "5gb": { ram: "5000", disk: "3000", cpu: "120", harga: 7000 },
  "6gb": { ram: "6000", disk: "3000", cpu: "140", harga: 8000 },
  "7gb": { ram: "7000", disk: "4000", cpu: "160", harga: 9000 },
  "8gb": { ram: "8000", disk: "4000", cpu: "180", harga: 10000 },
  "9gb": { ram: "9000", disk: "5000", cpu: "200", harga: 11000 },
  "10gb": { ram: "10000", disk: "5000", cpu: "220", harga: 12000 },
};

let sessionPanels = {}; // Memory only!

function generateRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Order Step 1
  if (!req.body.cek && !req.body.ambil) {
    const { username, password, paket } = req.body;
    if (!username || !password || !paketObj[paket])
      return res.status(400).json({ msg: "Field wajib diisi/invalid" });

    const amount = paketObj[paket].harga + generateRandomNumber(110, 250);

    try {
      const resp = await axios.get(`${apibot1}/api/orkut/createpayment?apikey=${apiSimpleBotv2}&amount=${amount}&codeqr=${qrisOrderKuota}`);
      sessionPanels[resp.data.result.transactionId] = {
        username, password, paket, amount, status: "WAITING"
      };
      res.json({
        qrImageUrl: resp.data.result.qrImageUrl,
        transactionId: resp.data.result.transactionId,
        amount: resp.data.result.amount,
      });
    } catch (e) {
      res.status(500).json({ msg: "Gagal buat QRIS. Cek API key/limit!" });
    }
    return;
  }

  // Cek pembayaran
  if (req.body.cek && req.body.transactionId) {
    const transactionId = req.body.transactionId;
    if (!sessionPanels[transactionId]) return res.status(400).json({ status: "NOTFOUND" });
    try {
      const status = await axios.get(`${apibot1}/api/orkut/cekstatus?apikey=${apiSimpleBotv2}&merchant=${merchantIdOrderKuota}&keyorkut=${apiOrderKuota}`);
      if (status?.data?.amount && status.data.amount == sessionPanels[transactionId].amount) {
        if (!sessionPanels[transactionId].panelInfo) {
          // 1. Buat user panel
          const userPanel = sessionPanels[transactionId];
          let userResp = await axios.post(domainV3 + "/api/application/users", {
            email: userPanel.username + "@fake.com",
            username: userPanel.username.toLowerCase(),
            first_name: userPanel.username,
            last_name: "Panel",
            language: "en",
            password: userPanel.password,
          }, { headers: { "Authorization": `Bearer ${apikeyV3}`, "Content-Type": "application/json" } });
          let usr_id = userResp.data.attributes.id;

          // 2. Startup panel
          let eggResp = await axios.get(domainV3 + `/api/application/nests/${nestidV3}/eggs/${eggV3}`, {
            headers: { "Authorization": `Bearer ${apikeyV3}`, "Content-Type": "application/json" }
          });
          let startup_cmd = eggResp.data.attributes.startup;

          // 3. Create server
          let paketData = paketObj[userPanel.paket];
          let serverResp = await axios.post(domainV3 + "/api/application/servers", {
            name: userPanel.username + "-server",
            description: `Panel by ${userPanel.username}`,
            user: usr_id,
            egg: parseInt(eggV3),
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
            startup: startup_cmd,
            environment: { "INST": "npm", "USER_UPLOAD": "0", "AUTO_UPDATE": "0", "CMD_RUN": "npm start" },
            limits: { memory: paketData.ram, swap: 0, disk: paketData.disk, io: 500, cpu: paketData.cpu },
            feature_limits: { databases: 5, backups: 5, allocations: 5 },
            deploy: { locations: [parseInt(locV3)], dedicated_ip: false, port_range: [] },
          }, { headers: { "Authorization": `Bearer ${apikeyV3}`, "Content-Type": "application/json" } });

          sessionPanels[transactionId].panelInfo = {
            username: userPanel.username,
            password: userPanel.password,
            domain: domainV3,
            serverId: serverResp.data.attributes.id,
          };
          const genToken = crypto.randomBytes(16).toString("hex");
          sessionPanels[transactionId].token = genToken;
        }
        sessionPanels[transactionId].status = "PAID";
        return res.json({ status: "PAID", token: sessionPanels[transactionId].token });
      } else {
        return res.json({ status: "PENDING" });
      }
    } catch (e) {
      return res.status(500).json({ status: "ERROR", msg: "Gagal cek status pembayaran." });
    }
  }

  // --- Ambil panel (klik tombol, token harus valid)
  if (req.body.ambil && req.body.transactionId && req.body.token) {
    const { transactionId, token } = req.body;
    if (!sessionPanels[transactionId] || sessionPanels[transactionId].token !== token)
      return res.status(401).json({ msg: "Token salah atau transaksi tidak ditemukan." });
    if (!sessionPanels[transactionId].panelInfo)
      return res.status(404).json({ msg: "Panel belum siap, silakan cek ulang." });

    // Panel info hanya dikirim kalau token dan transactionId valid
    return res.json({ panelInfo: sessionPanels[transactionId].panelInfo });
  }

  return res.status(400).json({ msg: "Permintaan tidak valid." });
}