// existing redirect-on-load
document.getElementById('loadBtn').addEventListener('click', () => {
  const tag = document.getElementById('tagInput').value.trim();
  if (tag) window.location.href = `/dashboard/${tag.toUpperCase()}`;
});

// -------- Player modal logic ----------
async function openModal(playerTag) {
  showBackdrop(true);
  const body   = document.getElementById('modalBody');
  body.innerHTML = '<p class=\"text-center\">Loading…</p>';

  try {
    const res  = await fetch(`/player/${encodeURIComponent('#'+playerTag)}`);
    const json = await res.json();
    body.innerHTML = renderPlayer(json);
    lucide.createIcons();         // refresh icons inside modal
  } catch (e) {
    body.innerHTML = `<p class=\"text-red-600\">Error: ${e}</p>`;
  }
}

function closeModal() { showBackdrop(false); }

function showBackdrop(show) {
  document.getElementById('modalBackdrop').classList.toggle('hidden', !show);
  document.getElementById('playerModal').classList.toggle('hidden', !show);
}

function renderPlayer(p) {
  return `
    <h3 class="text-xl font-semibold mb-2">${p.name} <span class="text-sm text-slate-500">(#${p.tag.substring(1)})</span></h3>
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div><span class="font-medium">Town Hall</span><br>${p.townHallLevel}</div>
      <div><span class="font-medium">Role</span><br>${p.role}</div>
      <div><span class="font-medium">Trophies</span><br>${p.trophies}</div>
      <div><span class="font-medium">Legend Stars</span><br>${p.legendStatistics?.legendTrophies ?? '—'}</div>
      <div><span class="font-medium">Donated</span><br>${p.donations}</div>
      <div><span class="font-medium">Received</span><br>${p.donationsReceived}</div>
    </div>
    <h4 class="mt-4 font-semibold">Troops donated today</h4>
    <p>${(p.troopsDonated ?? []).map(t => t.name + ' ×' + t.count).join(', ') || '—'}</p>
  `;
}
