(async () => {
  const base = 'https://ra1dashboard.vercel.app';
  const hdr = { 'Content-Type': 'application/json' };
  const parentRes = await fetch(base + '/api/parents?search=' + encodeURIComponent('Kevin Houston') + '&limit=1');
  const parentJson = await parentRes.json();
  const parent = parentJson?.data?.parents?.[0];
  if (!parent) { console.log('No parent'); return; }
  const payRes = await fetch(base + `/api/payments?parentId=${encodeURIComponent(parent._id || parent.id)}&limit=25`);
  const payJson = await payRes.json();
  const payments = payJson?.data?.payments || [];
  console.log('Payments count', payments.length);
  for (const p of payments) {
    const pid = p._id || p.id;
    const progRes = await fetch(base + `/api/payments/${pid}/progress?nocache=${Date.now()}`);
    const prog = await progRes.json();
    const inst = (prog?.installments || []).find((i) => i.status === 'paid');
    if (inst) {
      console.log('Found paid installment', inst._id || inst.id, 'for payment', pid);
      const postRes = await fetch(base + `/api/installments/${inst._id || inst.id}/manual`, {
        method: 'POST', headers: hdr,
        body: JSON.stringify({ markPaid: false, method: 'manual', note: 'automated test', actor: 'admin' })
      });
      const raw = await postRes.text();
      let postJson = {}; try { postJson = JSON.parse(raw); } catch (e) { postJson = { raw }; }
      console.log('Manual unmark response', postRes.status, postJson);
      const progRes2 = await fetch(base + `/api/payments/${pid}/progress?nocache=${Date.now()}`);
      const prog2 = await progRes2.json();
      console.log('After unmark first installment statuses', (prog2?.installments || []).slice(0, 5).map(x => x.status));
      return;
    }
  }
  console.log('No paid installment found');
})().catch(e => { console.error(e); process.exit(1); });

