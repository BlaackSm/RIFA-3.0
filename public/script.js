// frontend
const rifaSelect = document.getElementById("rifa-selecionada");
const cartelaContainer = document.getElementById("cartela-container");
const nomeComprador = document.getElementById("nome-comprador");
const telefoneComprador = document.getElementById("telefone-comprador");
const confirmarSelecao = document.getElementById("confirmar-selecao");
const pixContainer = document.getElementById("pix-container");
const pixInfo = document.getElementById("pix-info");
const pixCopiaCola = document.getElementById("pix-copia-cola");
const copiarPixBtn = document.getElementById("copiar-pix");

const abrirLoginAdmin = document.getElementById("abrir-login-admin");
const loginAdmin = document.getElementById("login-admin");
const senhaAdmin = document.getElementById("senha-admin");
const btnLoginAdmin = document.getElementById("btn-login-admin");
const loginMsg = document.getElementById("login-msg");
const adminContainer = document.getElementById("admin-container");
const listaOrganizador = document.getElementById("lista-organizador");

const contadorTopo = document.getElementById("contador-topo");
const CHAVE_PIX = "seu-email@pix.com";

let rifas = [];
let rifaData = null;
let rifaIndex = 0;
let numerosSelecionados = [];

async function carregarRifas(){
  const res = await fetch("/api/rifas");
  rifas = await res.json();
  rifaSelect.innerHTML = "";
  rifas.forEach((r,i)=>{
    const o = document.createElement("option");
    o.value = i;
    o.textContent = `${r.nome} - R$${r.valor.toFixed(2)}`;
    rifaSelect.appendChild(o);
  });
  carregarCartela(0);
}

async function carregarCartela(index){
  rifaIndex = parseInt(index,10);
  const res = await fetch(`/api/rifa/${index}`);
  rifaData = await res.json();
  numerosSelecionados = [];
  atualizarVisual();
  if (adminContainer.style.display === "block") atualizarOrganizador();
}

function atualizarVisual(){
  cartelaContainer.innerHTML = "";

  const vendidos = rifaData.cartela.filter(n => n.status === "pago").length;
  const restantes = rifaData.cartela.filter(n => n.status === "disponivel").length;
  contadorTopo.textContent = `Vendidos: ${vendidos} | Restantes: ${restantes}`;

  rifaData.cartela.forEach((n, idx) => {
    const div = document.createElement("div");
    div.className = "numero";
    div.textContent = n.numero;

    if (n.status === "pago") div.classList.add("pago");
    else if (n.status === "pendente") div.classList.add("pendente");
    else if (numerosSelecionados.includes(idx)) div.classList.add("selecionado");

    if (n.comprador) div.title = `Comprador: ${n.comprador}`;

    if (n.status === "disponivel") {
      div.addEventListener("click", () => {
        if (!nomeComprador.value.trim() || !telefoneComprador.value.trim()) {
          alert("Preencha nome e telefone antes de selecionar números.");
          return;
        }
        if (numerosSelecionados.includes(idx)) {
          numerosSelecionados = numerosSelecionados.filter(x => x !== idx);
        } else {
          numerosSelecionados.push(idx);
        }
        atualizarVisual();
      });
    }
    cartelaContainer.appendChild(div);
  });
}

confirmarSelecao.addEventListener("click", async () => {
  if (numerosSelecionados.length === 0) return alert("Selecione ao menos 1 número.");
  const nome = nomeComprador.value.trim();
  const telefone = telefoneComprador.value.trim();
  if (!nome || !telefone) return alert("Preencha nome e telefone.");

  const res = await fetch("/api/comprar", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ rifaIndex, numeros: numerosSelecionados, nome, telefone })
  });
  const data = await res.json();
  if (data.error) {
    alert(data.error);
    await carregarCartela(rifaIndex);
    return;
  }

  const valorTotal = (numerosSelecionados.length * rifaData.valor).toFixed(2);
  pixInfo.textContent = `Valor total: R$${valorTotal} — Números: ${numerosSelecionados.map(i=> rifaData.cartela[i].numero).join(", ")}`;
  pixCopiaCola.value = CHAVE_PIX;
  pixContainer.style.display = "block";

  await carregarCartela(rifaIndex);
});

copiarPixBtn.addEventListener("click", () => {
  pixCopiaCola.select();
  document.execCommand("copy");
  alert("Chave PIX copiada (apenas a chave). Faça o pagamento do valor exibido acima.");
});

abrirLoginAdmin.addEventListener("click", () => {
  loginAdmin.style.display = "block";
});

btnLoginAdmin.addEventListener("click", async () => {
  const senha = senhaAdmin.value.trim();
  if (!senha) return;
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ senha })
    });
    if (res.status === 200) {
      const data = await res.json();
      if (data.success) {
        adminContainer.style.display = "block";
        loginAdmin.style.display = "none";
        atualizarOrganizador();
      } else loginMsg.textContent = "Senha incorreta.";
    } else loginMsg.textContent = "Senha incorreta.";
  } catch (e) {
    loginMsg.textContent = "Erro no login.";
  }
});

function atualizarOrganizador(){
  listaOrganizador.innerHTML = "";
  const agrupado = {};
  rifaData.cartela.forEach((n, idx) => {
    if (n.comprador && n.status === "pendente") {
      if (!agrupado[n.comprador]) agrupado[n.comprador] = [];
      agrupado[n.comprador].push({ idx, timestamp: n.timestamp });
    }
  });

  const buyers = Object.keys(agrupado);
  if (buyers.length === 0) {
    listaOrganizador.innerHTML = "<li class='note'>Nenhum comprador pendente</li>";
    return;
  }

  // cria um item por comprador com temporizador (menor tempo entre números)
  buyers.forEach(nome => {
    const itens = agrupado[nome]; // array de {idx, timestamp}
    // calcula expiresAt = min(timestamp + 24h)
    const expiresAt = Math.min(...itens.map(it => (it.timestamp || 0) + 24*60*60*1000));

    const li = document.createElement("li");
    li.className = "lista-item";

    const left = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = nome;
    const span = document.createElement("span");
    span.textContent = " — " + itens.map(it => rifaData.cartela[it.idx].numero).join(", ");
    left.appendChild(strong);
    left.appendChild(span);

    const right = document.createElement("div");
    const timer = document.createElement("span");
    timer.className = "timer";
    timer.style.marginRight = "8px";
    right.appendChild(timer);

    const btnPago = document.createElement("button");
    btnPago.className = "btn-small btn-pago";
    btnPago.textContent = "Pago";
    btnPago.addEventListener("click", async () => {
      await fetch("/api/pago", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ rifaIndex, numeros: itens.map(it => it.idx) })
      });
      await carregarCartela(rifaIndex);
    });

    const btnNao = document.createElement("button");
    btnNao.className = "btn-small btn-naopago";
    btnNao.textContent = "Não Pagou";
    btnNao.addEventListener("click", async () => {
      await fetch("/api/cancelar", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ rifaIndex, numeros: itens.map(it => it.idx) })
      });
      await carregarCartela(rifaIndex);
    });

    right.appendChild(btnPago);
    right.appendChild(btnNao);
    li.appendChild(left);
    li.appendChild(right);
    // data for countdown
    li.dataset.expiresAt = expiresAt;
    listaOrganizador.appendChild(li);

    // start countdown for this li
  });

  // start global interval to update timers
  startOrganizadorCountdown();
}

let organizerInterval = null;
function startOrganizadorCountdown(){
  if (organizerInterval) return;
  organizerInterval = setInterval(()=>{
    const now = Date.now();
    document.querySelectorAll('#lista-organizador li').forEach(li => {
      const expiresAt = parseInt(li.dataset.expiresAt || 0, 10);
      const timer = li.querySelector('.timer');
      if (!timer) return;
      let diff = expiresAt - now;
      if (diff <= 0){
        timer.textContent = '00:00:00';
        // auto-release by calling cancelar for that buyer
        const nomestr = li.querySelector('strong').textContent;
        // Find indices for this buyer from rifaData
        const indices = rifaData.cartela.map((n,i)=> (n.comprador===nomestr && n.status==='pendente')?i:null).filter(x=>x!==null);
        if (indices.length>0){
          fetch('/api/cancelar', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ rifaIndex, numeros: indices })
          }).then(()=>carregarCartela(rifaIndex));
        }
      } else {
        const h = String(Math.floor(diff/3600000)).padStart(2,'0');
        const m = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
        const s = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
        timer.textContent = `${h}:${m}:${s}`;
      }
    });
  }, 1000);
}

rifaSelect.addEventListener("change", () => carregarCartela(rifaSelect.value));
carregarRifas();
