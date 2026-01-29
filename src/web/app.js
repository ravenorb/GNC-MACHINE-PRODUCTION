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

const buildSection = (title) => {
  const section = document.createElement("section");
  section.className = "detail-section";
  const header = document.createElement("div");
  header.className = "detail-section__header";
  const heading = document.createElement("h3");
  heading.textContent = title;
  header.appendChild(heading);
  const body = document.createElement("div");
  body.className = "detail-section__body";
  section.append(header, body);
  return { section, body };
};

const renderDetail = (data) => {
  detailViewEl.innerHTML = "";

  if (!data) {
    detailViewEl.innerHTML = '<div class="panel__empty">Select a cut sheet to view metadata.</div>';
    return;
  }

  const { cutsheet, parsed_from_pdf: parsed, parts, related_files: relatedFiles } = data;

  detailSubtitleEl.textContent = `${cutsheet.product} · Station ${cutsheet.station_code} · Run ${cutsheet.run_number || "—"}`;

  const overview = buildSection("Program Overview");
  const overviewGrid = document.createElement("div");
  overviewGrid.className = "detail-grid";
  overviewGrid.append(
    buildDetailCard("Product", cutsheet.product),
    buildDetailCard("Station", cutsheet.station_code),
    buildDetailCard("Run #", cutsheet.run_number),
    buildDetailCard("File Name", parsed?.file_name || cutsheet.file_name),
    buildDetailCard("Run Time", parsed?.run_time),
    buildDetailCard("Created", parsed?.date_time)
  );
  overview.body.appendChild(overviewGrid);

  const material = buildSection("Material");
  const materialGrid = document.createElement("div");
  materialGrid.className = "detail-grid";
  materialGrid.append(
    buildDetailCard("Material Type", parsed?.material_type),
    buildDetailCard("Gauge", parsed?.gauge ? `${parsed.gauge} GA` : "—"),
    buildDetailCard(
      "Sheet Size",
      parsed?.sheet_size_ft
        ? `${parsed.sheet_size_ft.width} ft × ${parsed.sheet_size_ft.length} ft`
        : "—"
    ),
    buildDetailCard(
      "Raw Dimensions",
      parsed?.sheet_dimensions_in
        ? `${formatNumber(parsed.sheet_dimensions_in.length)} × ${formatNumber(
            parsed.sheet_dimensions_in.width
          )} × ${formatNumber(parsed.sheet_dimensions_in.thickness)} in`
        : "—"
    )
  );
  material.body.appendChild(materialGrid);

  const notes = buildSection("Production Notes");
  const notesGrid = document.createElement("div");
  notesGrid.className = "detail-grid";
  notesGrid.append(
    buildDetailCard("Part Description", parsed?.user_data_3),
    buildDetailCard("Notes / Frame Qty", parsed?.notes)
  );
  notes.body.appendChild(notesGrid);

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

  const equipmentValues = [parsed?.company_name, parsed?.machine_type, parsed?.software_used].filter(
    (value) => value
  );
  let equipmentSection = null;
  if (equipmentValues.length) {
    const equipment = buildSection("Equipment");
    const equipmentGrid = document.createElement("div");
    equipmentGrid.className = "detail-grid";
    equipmentGrid.append(
      buildDetailCard("Company", parsed?.company_name),
      buildDetailCard("Machine", parsed?.machine_type),
      buildDetailCard("Software", parsed?.software_used)
    );
    equipment.body.appendChild(equipmentGrid);
    equipmentSection = equipment.section;
  }

  const partsSection = document.createElement("div");
  partsSection.className = "detail-section";
  const partsHeader = document.createElement("div");
  partsHeader.className = "detail-section__header";
  const partsTitle = document.createElement("h3");
  partsTitle.textContent = "Nested Parts";
  partsHeader.appendChild(partsTitle);
  partsSection.appendChild(partsHeader);
  const partsBody = document.createElement("div");
  partsBody.className = "detail-section__body";

  if (parts?.length) {
    const table = document.createElement("table");
    table.className = "parts-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Part #</th>
          <th># Pcs</th>
        </tr>
      </thead>
      <tbody>
        ${parts
          .map((part) => {
            return `
              <tr>
                <td>${part.part_number || "—"}</td>
                <td>${formatNumber(part.quantity)}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    `;
    partsBody.appendChild(table);
  } else {
    const empty = document.createElement("p");
    empty.textContent = "No part rows parsed from the PDF yet.";
    partsBody.appendChild(empty);
  }
  partsSection.appendChild(partsBody);

  detailViewEl.append(overview.section, material.section, notes.section, links);
  if (equipmentSection) {
    detailViewEl.appendChild(equipmentSection);
  }
  detailViewEl.appendChild(partsSection);
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
