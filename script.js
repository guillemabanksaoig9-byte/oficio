const form = document.querySelector("#oficioForm");
const previewDocument = document.querySelector("#previewDocument");
const template = document.querySelector("#docTemplate");
const liveClock = document.querySelector("#liveClock");
const liveDate = document.querySelector("#liveDate");
const numeroOficioInput = document.querySelector("#numeroOficio");
const printBtn = document.querySelector("#printBtn");
const copyBtn = document.querySelector("#copyBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const resetBtn = document.querySelector("#resetBtn");

const templates = {
  solicitacao:
    "Venho por meio deste solicitar a gentileza de providenciar as informações/documentos referentes a {{assunto}}.\n\nSolicitamos o envio até {{prazo}} para que possamos dar seguimento aos procedimentos administrativos cabíveis.",
  comunicado:
    "Comunicamos que {{assunto}}, em conformidade com as diretrizes institucionais vigentes.\n\nSolicitamos ciência e ampla divulgação às equipes envolvidas.",
  encaminhamento:
    "Encaminhamos a Vossa Senhoria o processo/documentação relativa a {{assunto}} para análise e providências cabíveis.\n\nFicamos à disposição para esclarecimentos adicionais.",
};

function now() {
  return new Date();
}

function formatDateLong(date = now()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
  }).format(date);
}

function formatTime(date = now()) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatShortDate(date = now()) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDeadline(value) {
  if (!value) {
    return "o prazo interno estabelecido";
  }

  const date = new Date(`${value}T00:00:00`);
  return formatShortDate(date);
}

function getOficioNumber() {
  const year = now().getFullYear();
  const key = `oficio-seq-${year}`;
  const current = Number(localStorage.getItem(key) || "0") + 1;
  localStorage.setItem(key, String(current));
  return `${String(current).padStart(3, "0")}/${year}`;
}

function startClock() {
  const tick = () => {
    const date = now();
    liveClock.textContent = formatTime(date);
    liveDate.textContent = formatDateLong(date);
  };
  tick();
  setInterval(tick, 1000);
}

function replaceTags(text, values) {
  return text.replace(/{{\s*(\w+)\s*}}/g, (_, key) => values[key] || "");
}

function parseBody(text, values) {
  const replaced = replaceTags(text, values)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return replaced.length
    ? replaced.map((line) => `<p>${line}</p>`).join("")
    : "<p>Digite o conteúdo do ofício para gerar a prévia.</p>";
}

function toFormData() {
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  data.dataLonga = formatDateLong();
  data.hora = formatTime();
  data.dataCurta = formatShortDate();
  data.prazo = formatDeadline(data.prazo);
  return data;
}

function saveDraft(data) {
  localStorage.setItem("oficio-draft", JSON.stringify(data));
}

function loadDraft() {
  const raw = localStorage.getItem("oficio-draft");
  if (!raw) {
    return;
  }

  try {
    const data = JSON.parse(raw);
    for (const [key, value] of Object.entries(data)) {
      const field = form.elements.namedItem(key);
      if (field && !field.readOnly) {
        field.value = value;
      }
    }
  } catch {
    localStorage.removeItem("oficio-draft");
  }
}

function generateDocument(data) {
  const fragment = template.content.cloneNode(true);
  const values = {
    ...data,
    data: data.dataCurta,
    prazo: data.prazo,
  };

  fragment.querySelector(".doc-org").textContent = data.orgao || "Órgão não informado";
  fragment.querySelector(".doc-setor").textContent = data.setor || "";
  fragment.querySelector(".doc-numero").textContent = data.numero;
  fragment.querySelector(".doc-assunto").textContent = data.assunto || "-";
  fragment.querySelector(".doc-local-data").textContent = `${data.cidade || "Cidade"}, ${data.dataLonga}`;
  fragment.querySelector(".doc-destinatario").textContent = `Ao(À) ${data.destinatario || "Destinatário"}`;
  fragment.querySelector(".doc-cargo").textContent = data.cargoDestinatario || "";
  fragment.querySelector(".doc-corpo").innerHTML = parseBody(data.corpo || "", values);
  fragment.querySelector(".doc-assinante").textContent = data.assinanteNome || "";
  fragment.querySelector(".doc-cargo-assinante").textContent = data.assinanteCargo || "";
  fragment.querySelector(".doc-registro").textContent = data.registro
    ? `Registro: ${data.registro}`
    : "";

  previewDocument.replaceChildren(fragment);
}

function updateDocument() {
  const data = toFormData();
  saveDraft(data);
  generateDocument(data);
}

function resetForm() {
  localStorage.removeItem("oficio-draft");
  form.reset();
  numeroOficioInput.value = getOficioNumber();
  updateDocument();
}

function copyDocument() {
  const text = previewDocument.innerText.trim();
  navigator.clipboard
    .writeText(text)
    .then(() => alert("Ofício copiado para a área de transferência."))
    .catch(() => alert("Não foi possível copiar automaticamente."));
}

function downloadDocument() {
  const name = `oficio-${numeroOficioInput.value.replace("/", "-")}.txt`;
  const blob = new Blob([previewDocument.innerText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function applyTemplate(name) {
  const area = form.elements.namedItem("corpo");
  if (!area || !templates[name]) {
    return;
  }
  area.value = templates[name];
  updateDocument();
}

function bootstrap() {
  numeroOficioInput.value = getOficioNumber();
  loadDraft();
  startClock();
  updateDocument();

  form.addEventListener("input", updateDocument);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    updateDocument();
  });

  document.querySelectorAll("[data-template]").forEach((button) => {
    button.addEventListener("click", () => applyTemplate(button.dataset.template));
  });

  printBtn.addEventListener("click", () => window.print());
  copyBtn.addEventListener("click", copyDocument);
  downloadBtn.addEventListener("click", downloadDocument);
  resetBtn.addEventListener("click", () => setTimeout(resetForm, 0));
}

bootstrap();
