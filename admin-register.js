import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6Vt_C-UM3BnvgBMnoitu5CBRHd3b_ikk",
  authDomain: "pakkom-ecotrack.firebaseapp.com",
  projectId: "pakkom-ecotrack",
  storageBucket: "pakkom-ecotrack.firebasestorage.app",
  messagingSenderId: "609321292317",
  appId: "1:609321292317:web:3bf4e7d0c8ea6e861d2cf4"
};

// GANTI kode ini. Catatan: kode yang disimpan di JavaScript dapat dilihat pengguna.
const ADMIN_CODE = "123";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const msg = document.getElementById("msg");

const onlyNumbers = v => /^[0-9]+$/.test(v);
const email = n => `${n}@myfilecloud.local`;

register.onclick = async () => {
  const number = document.getElementById("number").value.trim();
  const password = document.getElementById("password").value;
  const code = document.getElementById("code").value;

  if (!onlyNumbers(number) || number.length < 4) return msg.textContent = "Nomor akun tidak valid.";
  if (password.length < 6) return msg.textContent = "Password minimal 6 karakter.";
  if (code !== ADMIN_CODE) return msg.textContent = "Kode admin salah.";

  try {
    const result = await createUserWithEmailAndPassword(auth, email(number), password);
    msg.textContent = `Admin berhasil dibuat: ${result.user.uid}`;
  } catch (e) {
    msg.textContent = e.code === "auth/email-already-in-use"
      ? "Akun sudah terdaftar."
      : "Register gagal. Periksa konfigurasi Firebase.";
  }
};
