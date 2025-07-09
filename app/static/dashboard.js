/* eslint-env browser */

document.addEventListener("DOMContentLoaded", () => {
    const tagInput = document.getElementById("tagInput");
    const loadBtn = document.getElementById("loadBtn");

    const go = () => {
        const tag = tagInput.value.trim().toUpperCase();
        if (tag) window.location.href = `/dashboard/${encodeURIComponent(tag)}`;
    };

    loadBtn?.addEventListener("click", go);
    tagInput?.addEventListener("keydown", (e) => e.key === "Enter" && go());

    const table = document.getElementById("membersTable");
    if (!table) return;                // page might be blank on first load

    const headers = table.querySelectorAll("thead th[data-sort]");
    headers.forEach((th) => {
        th.addEventListener("click", () => sortBy(th));
    });

    function sortBy(th) {
        const dir = th.dataset.dir === "asc" ? "desc" : "asc"; // toggle
        headers.forEach(h => {
            h.dataset.dir = "";
            h.querySelector("i")?.remove();
        });

        th.dataset.dir = dir;
        addArrow(th, dir);

        const idx = th.cellIndex;
        const type = th.dataset.type;
        const tbody = table.tBodies[0];
        const rows = Array.from(tbody.rows);

        rows.sort((a, b) => {
            const v1 = getValue(a.cells[idx], type);
            const v2 = getValue(b.cells[idx], type);
            if (v1 < v2) return dir === "asc" ? -1 : 1;
            if (v1 > v2) return dir === "asc" ? 1 : -1;
            return 0;
        });

        tbody.append(...rows);
    }

    function getValue(cell, type) {
        const txt = cell.textContent.trim();
        switch (type) {
            case "number":
                // handle “123/456” in Donations by using the first number
                return parseInt(txt.split("/")[0].replace(/\D/g, ""), 10) || 0;
            case "date":
                return txt === "—" ? 0 : new Date(txt).getTime();
            default:                    // string
                return txt.toLowerCase();
        }
    }

    function addArrow(th, dir) {
        const icon = document.createElement("i");
        icon.dataset.lucide = dir === "asc" ? "chevron-up" : "chevron-down";
        icon.className = "w-4 h-4 inline-block ml-1";
        th.appendChild(icon);
        // re-scan for new Lucide icons
        lucide.createIcons();
    }
});

// ─── Player modal helpers ─────────────────────────────────────────────
async function openModal(tag) {
    // Show modal scaffold
    document.getElementById("modalBackdrop").classList.remove("hidden");
    const modal = document.getElementById("playerModal");
    modal.classList.remove("hidden");
    const body = document.getElementById("modalBody");
    body.innerHTML = "<p class='text-center py-8'>Loading…</p>";

    try {
        const res = await fetch(`/player/${encodeURIComponent(tag)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const p = await res.json();

        // Normalise key naming (depends on backend patch)
        p.last_seen = p.last_seen || p._lastSeen || null;

        renderPlayerCard(body, p);
    } catch (err) {
        body.innerHTML = `<p class="text-center text-red-600 py-8">${err.message}</p>`;
    }
}

function closeModal() {
    document.getElementById("modalBackdrop").classList.add("hidden");
    document.getElementById("playerModal").classList.add("hidden");
}

function renderPlayerCard(container, p) {
    const fmt = (iso) =>
        iso ? new Date(iso).toLocaleDateString(undefined, {dateStyle: "medium"}) : "—";

    container.innerHTML = /* html */ `
    <h3 class="text-xl font-semibold text-slate-800 flex flex-wrap items-center gap-2">
      <span>${p.name}</span>
      <span class="text-sm font-normal text-slate-500">${p.tag}</span>
    </h3>

    <div class="grid grid-cols-2 gap-4">
      ${stat("Town Hall", p.townHallLevel)}
      ${stat("Trophies", p.trophies)}
      ${stat("Donations", p.donations)}
      ${stat("Received", p.donationsReceived)}
    </div>

    <p class="mt-4">
      <span class="font-semibold">Last seen:</span> ${fmt(p.last_seen)}
    </p>
  `;
}

function stat(label, value) {
    return `
    <div>
      <p class="text-sm text-slate-500">${label}</p>
      <p class="text-xl font-semibold">${value ?? "—"}</p>
    </div>
  `;
}
