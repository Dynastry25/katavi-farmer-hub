const escapeCell = (value) => {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const downloadCSV = (filename, headers, rows) => {
  const csv = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const printView = ({ title, subtitle, headers, rows, statGroups }) => {
  const tableHtml = headers && headers.length
    ? `<table><thead><tr>${headers.map((h) => `<th>${String(h).replace(/</g, '&lt;')}</th>`).join('')}</tr></thead>
       <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${String(cell ?? '').replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : '<p>Hakuna data ya kuchapisha</p>';

  const statsHtml = statGroups && statGroups.length
    ? `<div class="stat-summary">${statGroups.map((s) => `<div class="stat-box"><b>${s.value ?? 0}</b><span>${String(s.label).replace(/</g, '&lt;')}</span></div>`).join('')}</div>`
    : '';

  const win = window.open('', '_blank', 'width=900,height=650');
  if (!win) return;
  win.document.write(`<!doctype html><html lang="sw"><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;padding:32px;color:#111;background:#fff}
      h1{color:#1a7431;border-bottom:3px solid #1a7431;padding-bottom:8px}
      p.subtitle{color:#555;margin-top:-8px}
      table{border-collapse:collapse;width:100%;margin-top:16px}
      th,td{border:1px solid #d1d5db;padding:7px 10px;text-align:left;font-size:13px}
      th{background:#1a7431;color:#fff}
      tr:nth-child(even){background:#f3f4f6}
      .stat-summary{display:flex;gap:14px;flex-wrap:wrap;margin:14px 0}
      .stat-box{border:1px solid #d1d5db;border-radius:8px;padding:12px 18px;text-align:center;min-width:120px}
      .stat-box b{display:block;font-size:24px;color:#1a7431}
      .stat-box span{font-size:12px;color:#555}
      footer{margin-top:24px;font-size:11px;color:#999}
      @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    </style></head><body>
    <h1>${String(title).replace(/</g, '&lt;')}</h1>
    ${subtitle ? `<p class="subtitle">${String(subtitle).replace(/</g, '&lt;')}</p>` : ''}
    ${statsHtml}
    ${tableHtml}
    <footer>Imetolewa na Katavi E-Kilimo - ${new Date().toLocaleString('sw-TZ')}</footer>
    </body></html>`);
  win.document.close();
  win.focus();
  win.print();
  win.close();
};