const statusEl = document.querySelector("#status");
const partsListEl = document.querySelector("#parts-list");
const detailViewEl = document.querySelector("#detail-view");
const detailSubtitleEl = document.querySelector("#detail-subtitle");

const state = {
  cutsheets: [],
  selectedPath: null,
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return "—";
  if (typeof value !== "number") return String(value);
  return Number.isInteger(value) ? value.toString() : value.toFixed(3);
};

const renderStatus = (message) => {
  statusEl.textContent = message;
};

const renderList = () => {
  partsListEl.innerHTML = "";

  if (state.cutsheets.length === 0) {
    partsListEl.innerHTML = '<div class="panel__empty">No cutsheets found.</div>';
    return;
  }

  state.cutsheets.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "part-card";
    card.setAttribute("aria-selected", item.cutsheet_metadata === state.selectedPath);

    const title = document.createElement("div");
    title.className = "part-card__title";
    title.textContent = `${item.product} · ${item.station_code}`;

    const meta = document.createElement("div");
    meta.className = "part-card__meta";
    meta.innerHTML = `
      <span class="badge">${item.station_code}</span>
      <span>${item.cutsheet_metadata}</span>
    `;

    card.appendChild(title);
    card.appendChild(meta);
    card.addEventListener("click", () => {
      selectCutsheet(item.cutsheet_metadata);
    });

    partsListEl.appendChild(card);
  });
};

const buildDetailCard = (title, value) => {
  const card = document.createElement("div");
  card.className = "detail-card";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const content = document.createElement("p");
  content.textContent = value ?? "—";
  card.append(heading, content);
  return card;
};

const renderDetail = (data) => {
  detailViewEl.innerHTML = "";

  if (!data) {
    detailViewEl.innerHTML = '<div class="panel__empty">Select a cut sheet to view metadata.</div>';
    return;
  }

  const { cutsheet, parsed_from_pdf: parsed, parts, related_files: relatedFiles, extracted_text_excerpt: excerpt } = data;

  detailSubtitleEl.textContent = `${cutsheet.product} · Station ${cutsheet.station_code}`;

  const grid = document.createElement("div");
  grid.className = "detail-grid";
  grid.append(
    buildDetailCard("Product", cutsheet.product),
    buildDetailCard("Station", cutsheet.station_code),
    buildDetailCard("Run", cutsheet.run_number),
    buildDetailCard("Material Hint", cutsheet.material_hint),
    buildDetailCard("File Type", cutsheet.file_type),
    buildDetailCard("Gauge", parsed?.gauge ? `${parsed.gauge} GA` : "—"),
    buildDetailCard(
      "Sheet Size",
      parsed?.sheet_size_ft
        ? `${parsed.sheet_size_ft.width} ft × ${parsed.sheet_size_ft.length} ft`
        : "—"
    )
  );

  const links = document.createElement("div");
  links.className = "detail-links";
  const pdfLink = document.createElement("a");
  pdfLink.href = `/${cutsheet.source_pdf}`;
  pdfLink.textContent = "Open PDF";
  pdfLink.target = "_blank";
  pdfLink.rel = "noopener";
  links.appendChild(pdfLink);

  if (Array.isArray(relatedFiles)) {
    relatedFiles.forEach((file) => {
      const link = document.createElement("a");
      link.href = `/${file.path}`;
      link.textContent = `Open ${file.extension?.toUpperCase() || "File"}`;
      link.target = "_blank";
      link.rel = "noopener";
      links.appendChild(link);
    });
  }

  const partsSection = document.createElement("div");
  partsSection.className = "detail-card";
  const partsHeader = document.createElement("h3");
  partsHeader.textContent = "Parts";
  partsSection.appendChild(partsHeader);

  if (parts?.length) {
    const table = document.createElement("table");
    table.className = "parts-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Part #</th>
          <th>Details</th>
          <th>Weight (lb)</th>
          <th>Dimensions (in)</th>
        </tr>
      </thead>
      <tbody>
        ${parts
          .map((part) => {
            const dims = part.dimensions_in
              ? `${formatNumber(part.dimensions_in.width)} × ${formatNumber(part.dimensions_in.length)}`
              : "—";
            return `
              <tr>
                <td>${part.part_number || "—"}</td>
                <td>${part.details || "—"}</td>
                <td>${formatNumber(part.weight_lb)}</td>
                <td>${dims}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    `;
    partsSection.appendChild(table);
  } else {
    const empty = document.createElement("p");
    empty.textContent = "No part rows parsed from the PDF yet.";
    partsSection.appendChild(empty);
  }

  const excerptSection = document.createElement("div");
  excerptSection.className = "detail-card";
  const excerptTitle = document.createElement("h3");
  excerptTitle.textContent = "Extracted Text Excerpt";
  const excerptBlock = document.createElement("pre");
  excerptBlock.className = "excerpt";
  excerptBlock.textContent = excerpt || "No excerpt available.";
  excerptSection.append(excerptTitle, excerptBlock);

  detailViewEl.append(grid, links, partsSection, excerptSection);
};

const selectCutsheet = async (metadataPath) => {
  state.selectedPath = metadataPath;
  renderList();
  detailSubtitleEl.textContent = "Loading cut sheet metadata…";
  detailViewEl.innerHTML = '<div class="panel__empty">Loading metadata…</div>';

  try {
    const response = await fetch(encodeURI(`/${metadataPath}`));
    if (!response.ok) {
      throw new Error(`Unable to load ${metadataPath}`);
    }
    const data = await response.json();
    renderDetail(data);
  } catch (error) {
    console.error(error);
    detailSubtitleEl.textContent = "Unable to load metadata.";
    detailViewEl.innerHTML = `<div class="panel__empty">${error.message}</div>`;
  }
};

const loadCutsheets = async () => {
  try {
    const response = await fetch("/data/cutsheets/index.json");
    if (!response.ok) {
      throw new Error("Unable to load cutsheet index.");
    }
    state.cutsheets = await response.json();
    renderStatus(`${state.cutsheets.length} cutsheets available`);
    renderList();
    if (state.cutsheets[0]) {
      selectCutsheet(state.cutsheets[0].cutsheet_metadata);
    }
  } catch (error) {
    console.error(error);
    renderStatus("Failed to load cutsheet index.");
    partsListEl.innerHTML = `<div class="panel__empty">${error.message}</div>`;
  }
};

loadCutsheets();
