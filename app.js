import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL,
  listAll, deleteObject
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

/*
  ============================================
  MASUKKAN CONFIG FIREBASE KAMU DI SINI
  Firebase Console -> Project settings -> Your apps -> Web app
  ============================================
*/
const firebaseConfig = {
  apiKey: "AIzaSyC6Vt_C-UM3BnvgBMnoitu5CBRHd3b_ikk",
  authDomain: "pakkom-ecotrack.firebaseapp.com",
  projectId: "pakkom-ecotrack",
  storageBucket: "pakkom-ecotrack.firebasestorage.app",
  messagingSenderId: "609321292317",
  appId: "1:609321292317:web:3bf4e7d0c8ea6e861d2cf4"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

const $ = id => document.getElementById(id);
const authPage = $("authPage"), dashboard = $("dashboard");
const loginBox = $("loginBox"), registerBox = $("registerBox");
const authMessage = $("authMessage");

function onlyNumbers(v){ return /^[0-9]+$/.test(v); }
function numberToEmail(n){ return `${n}@myfilecloud.local`; }

function showMessage(text,type="error"){
  authMessage.textContent=text;
  authMessage.className=type;
  authMessage.style.display="block";
}
function clearMessage(){
  authMessage.textContent="";
  authMessage.className="";
  authMessage.style.display="none";
}
function friendlyAuthError(error, action){
  const code=error?.code || "";
  if(code==="auth/email-already-in-use") return "Akun sudah terdaftar";
  if(code==="auth/weak-password") return "Password minimal 6 karakter";
  if(code==="auth/invalid-credential" || code==="auth/user-not-found") return "Kamu belum memiliki akun atau data login salah";
  if(code==="auth/wrong-password") return "Password salah";
  if(code==="auth/too-many-requests") return "Terlalu banyak percobaan. Coba lagi nanti.";
  return `${action} gagal. Periksa konfigurasi Firebase.`;
}

$("showRegister").onclick=()=>{loginBox.classList.add("hidden");registerBox.classList.remove("hidden");clearMessage();};
$("showLogin").onclick=()=>{registerBox.classList.add("hidden");loginBox.classList.remove("hidden");clearMessage();};

$("registerBtn").onclick=async()=>{
  const number=$("registerNumber").value.trim();
  const password=$("registerPassword").value;
  const password2=$("registerPassword2").value;

  if(!onlyNumbers(number)){showMessage("Register hanya menggunakan angka");return;}
  if(number.length<4){showMessage("Nomor akun minimal 4 angka");return;}
  if(password.length<6){showMessage("Password minimal 6 karakter");return;}
  if(password!==password2){showMessage("Password tidak sama");return;}

  try{
    await createUserWithEmailAndPassword(auth,numberToEmail(number),password);
    showMessage("Register berhasil! Kamu sudah login.","success");
  }catch(error){
    console.error(error);
    showMessage(friendlyAuthError(error,"Register"));
  }
};

$("loginBtn").onclick=async()=>{
  const number=$("loginNumber").value.trim();
  const password=$("loginPassword").value;

  if(!onlyNumbers(number)){showMessage("Login hanya menggunakan angka");return;}
  if(!number || !password){showMessage("Nomor akun dan password wajib diisi");return;}

  try{
    await signInWithEmailAndPassword(auth,numberToEmail(number),password);
  }catch(error){
    console.error(error);
    showMessage(friendlyAuthError(error,"Login"));
  }
};

$("logoutBtn").onclick=()=>signOut(auth);

onAuthStateChanged(auth,async user=>{
  if(user){
    authPage.classList.add("hidden");
    dashboard.classList.remove("hidden");
    $("welcome").textContent=`Login sebagai akun ${user.email.split("@")[0]}`;
    await loadFiles();
  }else{
    authPage.classList.remove("hidden");
    dashboard.classList.add("hidden");
  }
});

let selectedFile=null;
$("fileInput").onchange=()=>setSelectedFile($("fileInput").files[0]);

function setSelectedFile(file){
  selectedFile=file || null;
  $("fileName").textContent=file ? `${file.name} — ${formatBytes(file.size)}` : "Belum ada file dipilih";
}

const dropzone=$("dropzone");
dropzone.addEventListener("dragover",e=>{e.preventDefault();dropzone.classList.add("drag");});
dropzone.addEventListener("dragleave",()=>dropzone.classList.remove("drag"));
dropzone.addEventListener("drop",e=>{
  e.preventDefault();dropzone.classList.remove("drag");
  setSelectedFile(e.dataTransfer.files[0]);
});

$("uploadBtn").onclick=()=>{
  const user=auth.currentUser;
  if(!user){$("uploadStatus").textContent="Kamu harus login terlebih dahulu";return;}
  if(!selectedFile){$("uploadStatus").textContent="Pilih file terlebih dahulu";return;}

  const safeName=selectedFile.name.replace(/[^\w.\- ()]/g,"_");
  const fileRef=ref(storage,`users/${user.uid}/${Date.now()}_${safeName}`);
  const task=uploadBytesResumable(fileRef,selectedFile);

  $("uploadBtn").disabled=true;
  $("uploadStatus").textContent="Mengupload...";
  $("progressBar").style.width="0%";

  task.on("state_changed",
    snap=>{
      const p=(snap.bytesTransferred/snap.totalBytes)*100;
      $("progressBar").style.width=`${p}%`;
      $("uploadStatus").textContent=`Upload ${Math.round(p)}%`;
    },
    error=>{
      console.error(error);
      $("uploadStatus").textContent="Upload gagal. Periksa Storage Rules dan konfigurasi Firebase.";
      $("uploadBtn").disabled=false;
    },
    async()=>{
      await getDownloadURL(task.snapshot.ref);
      $("uploadStatus").textContent="File berhasil diupload!";
      $("progressBar").style.width="100%";
      $("fileInput").value="";
      setSelectedFile(null);
      $("uploadBtn").disabled=false;
      await loadFiles();
    }
  );
};

async function loadFiles(){
  const user=auth.currentUser;
  if(!user)return;
  $("fileList").innerHTML='<div class="empty">Memuat file...</div>';

  try{
    const folder=ref(storage,`users/${user.uid}`);
    const result=await listAll(folder);

    if(!result.items.length){
      $("fileList").innerHTML='<div class="empty">Belum ada file.</div>';
      return;
    }

    $("fileList").innerHTML="";
    for(const item of result.items){
      const url=await getDownloadURL(item);
      const div=document.createElement("div");
      div.className="file-item";

      const info=document.createElement("div");
      info.className="file-info";
      const name=document.createElement("div");
      name.className="file-name";
      name.textContent=displayName(item.name);
      const meta=document.createElement("div");
      meta.className="file-meta";
      meta.textContent="File tersimpan di akun kamu";
      info.append(name,meta);

      const actions=document.createElement("div");
      actions.className="file-actions";

      const download=document.createElement("button");
      download.className="download";
      download.textContent="Download";
      download.onclick=()=>window.open(url,"_blank","noopener,noreferrer");

      const del=document.createElement("button");
      del.className="delete";
      del.textContent="Hapus";
      del.onclick=async()=>{
        if(!confirm("Hapus file ini?"))return;
        try{await deleteObject(item);await loadFiles();}
        catch(e){console.error(e);alert("Gagal menghapus file.");}
      };

      actions.append(download,del);
      div.append(info,actions);
      $("fileList").appendChild(div);
    }
  }catch(error){
    console.error(error);
    $("fileList").innerHTML='<div class="empty">Gagal memuat file. Periksa Firebase Storage Rules.</div>';
  }
}

function displayName(name){
  const first=name.indexOf("_");
  return first>0 ? name.slice(first+1) : name;
}
function formatBytes(bytes){
  if(!bytes)return "0 B";
  const units=["B","KB","MB","GB","TB"];
  const i=Math.floor(Math.log(bytes)/Math.log(1024));
  return `${(bytes/Math.pow(1024,i)).toFixed(i?1:0)} ${units[i]}`;
}
$("refreshBtn").onclick=loadFiles;
