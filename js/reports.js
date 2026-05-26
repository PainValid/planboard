// ========== REPORT DROPDOWN TOGGLE ==========
function toggleReportMenu(){
  const menu = document.getElementById('reportMenu');
  const chevron = document.getElementById('reportChevron');
  if(!menu) return;
  const isOpen = menu.classList.toggle('open');
  if(chevron) chevron.className = isOpen ? 'ti ti-chevron-up' : 'ti ti-chevron-down';
}

function toggleProjReportMenu(){
  const menu = document.getElementById('projReportMenu');
  const chevron = document.getElementById('projReportChevron');
  if(!menu) return;
  const isOpen = menu.classList.toggle('open');
  if(chevron) chevron.className = isOpen ? 'ti ti-chevron-up' : 'ti ti-chevron-down';
}

document.addEventListener('click', function(e){
  // Overall report dropdown
  const wrap = document.getElementById('reportDropdownWrap');
  if(wrap && !wrap.contains(e.target)){
    const menu = document.getElementById('reportMenu');
    const chevron = document.getElementById('reportChevron');
    if(menu) menu.classList.remove('open');
    if(chevron) chevron.className = 'ti ti-chevron-down';
  }
  // Project report dropdown
  const pwrap = document.getElementById('projReportDropdownWrap');
  if(pwrap && !pwrap.contains(e.target)){
    const pmenu = document.getElementById('projReportMenu');
    const pchevron = document.getElementById('projReportChevron');
    if(pmenu) pmenu.classList.remove('open');
    if(pchevron) pchevron.className = 'ti ti-chevron-down';
  }
});

function exportProjectCSV(){
  const p = currentProject();
  if(!p) return notif('Open a project first','error');
  const rows = [['Task Name','PIC','Status','Start Date','Due Date']];
  rows.push([p.name, p.pic||'', p.status, p.startDate||'', p.dueDate||'']);
  p.tasks.forEach(t => rows.push([t.name, t.pic||'', t.status, t.startDate||'', t.dueDate||'']));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `${p.name.replace(/\s+/g,'_')}_tasks.csv`;
  a.click();
  notif('Project CSV exported');
}

// ========== REPORT EXPORTS ENGINE ==========
function exportExecutiveReport(){
  const today = new Date().toISOString().slice(0,10);
  const allProjects = state.projects;
  const bucketMap = {};
  state.buckets.forEach(b => bucketMap[b.id] = b);

  const total = allProjects.length;
  const byStatus = {};
  ['To-do','On-going','Completed','On hold','Cancelled'].forEach(s => byStatus[s] = 0);
  allProjects.forEach(p => { if(byStatus[p.status]!==undefined) byStatus[p.status]++; });

  const today_d = new Date(); today_d.setHours(0,0,0,0);
  const atRisk = allProjects.filter(p => {
    if(!p.dueDate || p.status==='Completed'||p.status==='Cancelled') return false;
    const due = new Date(p.dueDate); due.setHours(0,0,0,0);
    return due <= today_d;
  });

  const totalTasks = allProjects.reduce((a,p)=>a+p.tasks.length,0);
  const doneTasks = allProjects.reduce((a,p)=>a+p.tasks.filter(t=>t.status==='Completed').length,0);
  const overallPct = totalTasks ? Math.round(doneTasks/totalTasks*100) : 0;

  const statusColors = { 'To-do':'#888780','On-going':'#D97706','Completed':'#3B6D11','On hold':'#7C3AED','Cancelled':'#DC2626' };

  const tableRows = allProjects.map(p => {
    const progress = getProgress(p);
    const fin = p.finance || {};
    const budget = fin.budget || 0;
    const actual = fin.actualInvest || 0;
    const variance = budget - actual;
    const saving = fin.monthlySaving || 0;
    const latest = p.updates && p.updates.length ? p.updates[p.updates.length-1] : null;

    const fmtMoney = m => m ? '$'+Number(m).toLocaleString() : '—';
    const varianceStr = budget&&actual ? `<span style='color:${variance>=0?'#3B6D11':'#DC2626'};font-weight:600'>${variance>=0?'+':''}${variance.toLocaleString()}</span>` : '—';

    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;font-weight:600">${p.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:12px;color:#555">${bucketMap[p.bucketId]?.name || 'N/A'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:12px">${p.pic||'—'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee"><span style="background:${statusColors[p.status]}15;color:${statusColors[p.status]};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">${p.status}</span></td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:12px;font-weight:600">${progress}%</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:12px">${fmtMoney(budget)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:12px">${fmtMoney(actual)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:12px">${varianceStr}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:12px">${fmtMoney(saving)}/mo</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:11px;color:#555">${fin.refs&&fin.refs.length ? fin.refs.map(r=>`<span style='background:#EEEEF7;color:#6264A7;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;margin:1px;display:inline-block'>${r.type}: ${r.num}${r.po?` · PO: ${r.po}`:''}${r.cost?' · $'+Number(r.cost).toLocaleString():''}</span>`).join(' ') : '—'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:11px;color:#666;max-width:200px">${latest?latest.text.slice(0,120)+(latest.text.length>120?'…':''):'—'}</td>
    </tr>`;
  }).join('');

  const atRiskSection = atRisk.length ? `
    <div style="margin:32px 0 16px;padding:16px 20px;background:#FEE2E2;border-radius:10px;border-left:4px solid #DC2626">
      <div style="font-size:14px;font-weight:700;color:#DC2626;margin-bottom:10px">🚨 Overdue Projects (${atRisk.length})</div>
      ${atRisk.map(p=>`<div style="font-size:13px;color:#7f1d1d;margin-bottom:4px">• <b>${p.name}</b> — Due: ${p.dueDate} — PIC: ${p.pic||'N/A'}</div>`).join('')}
    </div>` : '';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Executive Summary — ${today}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',system-ui,sans-serif;color:#1f1f1f;background:#f8f9fa;padding:30px}
      .container{max-width:1280px;margin:0 auto;background:#fff;padding:30px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.05)}
      .hdr{display:flex;justify-content:between;align-items:center;border-bottom:2px solid #6264A7;padding-bottom:16px;margin-bottom:24px}
      .kpi-row{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:24px}
      .kpi-card{background:#faf9f8;border:1px solid #e1dfdd;border-radius:8px;padding:14px;text-align:center}
      .kpi-val{font-size:20px;font-weight:700;color:#6264A7;margin-top:4px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th{background:#6264A7;color:#fff;font-size:11px;text-transform:uppercase;padding:10px 12px;text-align:left}
    </style>
    </head>
    <body>
    <div class="container">
      <div class="hdr">
        <div><h1 style="font-size:22px;color:#6264A7">Executive Portfolio Summary</h1><p style="font-size:12px;color:#666">Generated on ${today} · PlanBoard Enterprise Engine</p></div>
        <div style="text-align:right"><button onclick="window.print()" style="padding:6px 14px;background:#6264A7;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600">Print / Save PDF</button></div>
      </div>
      <div class="kpi-row">
        <div class="kpi-card"><div style="font-size:12px;color:#666">Total Portfolios</div><div class="kpi-val">${total}</div></div>
        <div class="kpi-card"><div style="font-size:12px;color:#666">On-going Active</div><div class="kpi-val" style="color:#D97706">${byStatus['On-going']}</div></div>
        <div class="kpi-card"><div style="font-size:12px;color:#666">Completed Delivery</div><div class="kpi-val" style="color:#3B6D11">${byStatus['Completed']}</div></div>
        <div class="kpi-card"><div style="font-size:12px;color:#666">Overdue / At Risk</div><div class="kpi-val" style="color:#DC2626">${atRisk.length}</div></div>
        <div class="kpi-card"><div style="font-size:12px;color:#666">Overall Task Burnout</div><div class="kpi-val" style="color:#185FA5">${overallPct}%</div></div>
      </div>
      ${atRiskSection}
      <h2 style="font-size:15px;color:#333;margin-top:20px">Detailed Financial Information</h2>
      <table><thead><tr><th>Project Name</th><th>Bucket</th><th>PIC</th><th>Status</th><th>Progress</th><th>Budget</th><th>Spent</th><th>Variance</th><th>Savings</th><th>Linked Refs</th><th>Latest Statement Update</th></tr></thead><tbody>${tableRows}</tbody></table>
    </div>
    </body></html>`;

  const win = window.open('','_blank'); win.document.write(html); win.document.close();
}

function exportGanttReport(){
  const today = new Date().toISOString().slice(0,10);
  const p = currentProject();
  if(!p) return notif('Must open workspace view to trigger report','error');

  const allDates = [p.startDate, p.dueDate, ...p.tasks.flatMap(t=>[t.startDate, t.dueDate])].filter(Boolean).sort();
  let days = [];
  if(allDates.length > 0){
    let sd = new Date(allDates[0]); sd.setDate(sd.getDate()-4);
    let ed = new Date(allDates[allDates.length-1]); ed.setDate(ed.getDate()+14);
    while(sd <= ed){ days.push(new Date(sd)); sd.setDate(sd.getDate()+1); }
  } else {
    for(let i=0;i<30;i++){ let d=new Date(); d.setDate(d.getDate()+i); days.push(d); }
  }

  const todayStr = new Date().toISOString().slice(0,10);
  const statusColors2 = { 'To-do':'#888780','On-going':'#D97706','Completed':'#3B6D11','On hold':'#7C3AED','Cancelled':'#DC2626' };

  function barStyle(s,e){
    if(!s||!e) return null;
    const sd=new Date(s), ed=new Date(e);
    if(ed<days[0] || sd>days[days.length-1]) return null;
    const leftDays = Math.max(0, Math.floor((sd - days[0])/86400000));
    const dur = Math.floor((ed-sd)/86400000)+1;
    return { left: leftDays*30, width: dur*30 };
  }

  const pBar = barStyle(p.startDate, p.dueDate);
  const sc = statusColors2[p.status] || '#6264A7';
  const progress = getProgress(p);

  const ganttCells = days.map(d=>{
    const isWknd = d.getDay()===0||d.getDay()===6;
    const isTdy = d.toISOString().slice(0,10)===todayStr;
    return `<td style="background:${isTdy?'rgba(220,38,38,.07)':isWknd?'#f8f8f8':'transparent'};border-right:1px solid ${isTdy?'#DC2626':'#eee'};padding:0;height:36px"></td>`;
  }).join('');

  const barInline = pBar ? `<div style="position:absolute;top:50%;transform:translateY(-50%);left:${pBar.left}px;width:${pBar.width}px;height:14px;background:${sc};border-radius:3px;opacity:.9"></div>` : '';

  const taskRows2 = p.tasks.map(t => {
    const tBar = barStyle(t.startDate,t.dueDate);
    const tc = statusColors2[t.status]||'#888';
    const tCells = days.map(d=>{
      const isWknd = d.getDay()===0||d.getDay()===6;
      const isTdy = d.toISOString().slice(0,10)===todayStr;
      return `<td style="background:${isTdy?'rgba(220,38,38,.07)':isWknd?'#f8f8f8':'transparent'};border-right:1px solid ${isTdy?'#DC2626':'#eee'};padding:0;height:30px"></td>`;
    }).join('');

    const tBarInline = tBar ? `<div style="position:absolute;top:50%;transform:translateY(-50%);left:${tBar.left}px;width:${tBar.width}px;height:10px;background:${tc};border-radius:2px;opacity:.8"></div>` : '';

    return `<tr>
      <td style="padding:5px 12px 5px 28px;font-size:11px;color:#555;white-space:nowrap;border-bottom:1px solid #eee">${t.name}</td>
      <td style="padding:5px 12px;font-size:11px;white-space:nowrap;border-bottom:1px solid #eee">${t.pic||'—'}</td>
      <td style="padding:5px 12px;border-bottom:1px solid #eee"><span style="color:${tc};font-size:10px;font-weight:600">${t.status}</span></td>
      <td style="padding:0;position:relative;border-bottom:1px solid #eee"><div style="position:absolute;inset:0;display:flex"><table><tr>${tCells}</tr></table></div>${tBarInline}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Gantt Timeline Chart Report</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',sans-serif;padding:24px;color:#222}
      table{border-collapse:collapse;width:100%}
      th{background:#f4f4f4;font-size:10px;text-transform:uppercase;padding:6px 10px;text-align:left;border-bottom:2px solid #ddd}
    </style></head><body>
    <h1 style="font-size:18px;color:#6264A7;margin-bottom:4px">Gantt Timeline Schedule Report</h1>
    <p style="font-size:12px;color:#666;margin-bottom:16px">Project: <b>${p.name}</b> · Generated on ${today} · Progress Breakdown: ${progress}%</p>
    <table style="border:1px solid #ccc">
      <thead><tr><th style="width:200px">WBS Element Name</th><th style="width:100px">Resource</th><th style="width:90px">Status</th><th style="padding:0"><div style="display:flex;width:${days.length*30}px">${days.map(d=>`<div style="width:30px;text-align:center;font-size:8px;font-weight:700;flex-shrink:0;border-right:1px solid #ddd">${d.getDate()}/${d.getMonth()+1}</div>`).join('')}</div></th></tr></thead>
      <tbody>
        <tr style="background:#fdfdfd">
          <td style="padding:8px 12px;font-size:12px;font-weight:700;border-bottom:1px solid #ddd">🚀 ${p.name}</td>
          <td style="padding:8px 12px;font-size:12px;font-weight:700;border-bottom:1px solid #ddd">${p.pic||'—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #ddd"><span style="color:${sc};font-size:11px;font-weight:700">${p.status}</span></td>
          <td style="padding:0;position:relative;border-bottom:1px solid #ddd"><div style="position:absolute;inset:0;display:flex"><table><tr>${ganttCells}</tr></table></div>${barInline}</td>
        </tr>
        ${taskRows2}
      </tbody>
    </table>
    <br><button onclick="window.print()" style="padding:6px 16px;background:#6264A7;color:#fff;border:none;border-radius:4px;cursor:pointer">Print Graph View</button>
    </body></html>`;

  const win = window.open('','_blank'); win.document.write(html); win.document.close();
}

function exportGanttOverviewPDF(){
  const today = new Date().toISOString().slice(0,10);
  const allProjects = bucketProjectsFiltered().filter(p=>p.status==='On-going');
  if(allProjects.length===0) return notif('No On-going projects to export','error');

  const WEEK_W=40, DAY_W=WEEK_W/7;
  let startBoundary=new Date(ganttRange.from||today);
  const sd=startBoundary.getDay(); startBoundary.setDate(startBoundary.getDate()-(sd===0?6:sd-1));
  let endBoundary=new Date(ganttRange.to||today); endBoundary.setDate(endBoundary.getDate()+7);
  let weeks=[]; let runner=new Date(startBoundary);
  while(runner<=endBoundary||weeks.length<4){ weeks.push(new Date(runner)); runner.setDate(runner.getDate()+7); }
  const minD=new Date(startBoundary), maxD=new Date(runner);
  const totalW=weeks.length*WEEK_W;

  const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let monthBlocks=[],curMStr='',curMW=0,curML=0;
  weeks.forEach((wDate,idx)=>{
    const mStr=`${monthNames[wDate.getMonth()]}-${String(wDate.getFullYear()).slice(-2)}`;
    if(idx===0){curMStr=mStr;curMW=WEEK_W;curML=0;}
    else if(mStr===curMStr){curMW+=WEEK_W;}
    else{monthBlocks.push({text:curMStr,left:curML,width:curMW});curMStr=mStr;curML=idx*WEEK_W;curMW=WEEK_W;}
    if(idx===weeks.length-1) monthBlocks.push({text:curMStr,left:curML,width:curMW});
  });

  function barPos(s,e){
    if(!s||!e) return null;
    const sd=new Date(s),ed=new Date(e);
    if(ed<minD||sd>maxD) return null;
    const left=Math.max(0,(sd-minD)/86400000*DAY_W);
    const w=Math.max(6,(ed-sd)/86400000*DAY_W+DAY_W-2);
    return {left,width:w};
  }

  const statusColors={'To-do':'#888780','On-going':'#D97706','Completed':'#3B6D11','On hold':'#7C3AED','Cancelled':'#DC2626'};
  const taskColors={'Completed':'#3B6D11','On-going':'#D97706','To-do':'#888780','On hold':'#7C3AED','Cancelled':'#DC2626'};

  const todayDays=(new Date()-minD)/86400000;
  const todayPx=Math.round(todayDays*DAY_W);

  const weekHeaderHtml=weeks.map((wDate,idx)=>{
    const d=wDate.getDate(),m=wDate.getMonth()+1;
    return `<div style="position:absolute;left:${idx*WEEK_W}px;width:${WEEK_W}px;text-align:center;font-size:9px;color:#666;border-right:1px solid #e0e0e0;line-height:20px">${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}</div>`;
  }).join('');
  const monthHeaderHtml=monthBlocks.map(mb=>`<div style="position:absolute;left:${mb.left}px;width:${mb.width}px;font-size:10px;font-weight:800;color:#6264A7;line-height:22px;padding-left:6px;border-right:2px solid #d0d0d0;overflow:hidden">${mb.text}</div>`).join('');

  const bucketGroups=state.buckets.map(b=>({
    bucket:b,
    projects:allProjects.filter(p=>p.bucketId===b.id)
  })).filter(g=>g.projects.length>0);

  let rowsHtml='';
  bucketGroups.forEach(g=>{
    rowsHtml+=`<tr><td colspan="2" style="padding:5px 10px;background:${g.bucket.color}20;border-top:2px solid ${g.bucket.color};border-bottom:1px solid #ddd;font-size:11px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:.5px">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${g.bucket.color};margin-right:6px;vertical-align:middle"></span>${g.bucket.name}
    </td>
    <td style="padding:0;background:${g.bucket.color}20;border-top:2px solid ${g.bucket.color};border-bottom:1px solid #ddd;position:relative">
      <div style="position:relative;height:28px;width:${totalW}px">
        <div style="position:absolute;left:${todayPx}px;top:0;bottom:0;width:1px;background:rgba(220,38,38,0.4)"></div>
      </div>
    </td></tr>`;

    g.projects.forEach(p=>{
      const pb=barPos(p.startDate,p.dueDate);
      const sortedTasks=[...(p.tasks||[])].sort((a,b)=>{
        const da=a.startDate?new Date(a.startDate):new Date('9999-12-31');
        const db=b.startDate?new Date(b.startDate):new Date('9999-12-31');
        return da-db;
      });
      rowsHtml+=`<tr style="background:#f5f5ff">
        <td style="padding:6px 10px;font-size:11px;font-weight:700;color:#333;border-bottom:1px solid #eee;white-space:nowrap;min-width:200px;max-width:200px;overflow:hidden;text-overflow:ellipsis" title="${p.name}">${p.name}</td>
        <td style="padding:6px 10px;font-size:11px;color:#666;border-bottom:1px solid #eee;white-space:nowrap;width:80px">${p.pic||'—'}</td>
        <td style="padding:0;border-bottom:1px solid #eee;position:relative">
          <div style="position:relative;height:28px;width:${totalW}px">
            <div style="position:absolute;left:${todayPx}px;top:0;bottom:0;width:1px;background:rgba(220,38,38,0.5)"></div>
            ${pb?`<div style="position:absolute;left:${pb.left}px;width:${pb.width}px;top:5px;height:16px;background:#6264A7;border-radius:3px;overflow:hidden">
              <span style="position:absolute;left:4px;top:0;line-height:16px;font-size:9px;color:#fff;white-space:nowrap;font-weight:600">${p.name}</span>
            </div>`:''}
          </div>
        </td>
      </tr>`;

      sortedTasks.forEach((t,ti)=>{
        const tb=barPos(t.startDate,t.dueDate);
        const tc2=taskColors[t.status]||'#888';
        rowsHtml+=`<tr>
          <td style="padding:3px 10px 3px 22px;font-size:10px;color:#555;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px" title="${t.name}"><span style="color:#aaa;margin-right:4px">${ti+1}.</span>${t.name}</td>
          <td style="padding:3px 10px;font-size:10px;color:#888;border-bottom:1px solid #f0f0f0;white-space:nowrap">${t.pic||'—'}</td>
          <td style="padding:0;border-bottom:1px solid #f0f0f0;position:relative">
            <div style="position:relative;height:22px;width:${totalW}px">
              <div style="position:absolute;left:${todayPx}px;top:0;bottom:0;width:1px;background:rgba(220,38,38,0.3)"></div>
              ${tb?`<div style="position:absolute;left:${tb.left}px;width:${tb.width}px;top:5px;height:11px;background:${tc2};border-radius:2px;opacity:.85;overflow:hidden">
                <span style="position:absolute;left:3px;top:0;line-height:11px;font-size:8px;color:#fff;white-space:nowrap">${t.name}</span>
              </div>`:''}
            </div>
          </td>
        </tr>`;
      });
    });
  });

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Gantt Overview — ${today}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',sans-serif;padding:20px;color:#222;font-size:12px}
    @media print{body{padding:0} .no-print{display:none} @page{size:A3 landscape;margin:10mm}}
    table{border-collapse:collapse;width:100%}
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #6264A7">
    <div>
      <h1 style="font-size:16px;color:#6264A7;font-weight:700">On-going Projects — Gantt Overview</h1>
      <p style="font-size:11px;color:#888;margin-top:2px">Generated: ${today} · Range: ${ganttRange.from} → ${ganttRange.to}</p>
    </div>
    <button class="no-print" onclick="window.print()" style="padding:6px 16px;background:#6264A7;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:600;font-size:12px">Print / Save PDF</button>
  </div>
  <table style="border:1px solid #ccc;table-layout:fixed">
    <thead>
      <tr>
        <th style="width:200px;padding:4px 10px;background:#f4f4f4;font-size:10px;text-transform:uppercase;border-bottom:2px solid #ddd;text-align:left">Project</th>
        <th style="width:80px;padding:4px 10px;background:#f4f4f4;font-size:10px;text-transform:uppercase;border-bottom:2px solid #ddd;text-align:left">PIC</th>
        <th style="padding:0;background:#f4f4f4;border-bottom:2px solid #ddd">
          <div style="position:relative;height:42px;width:${totalW}px;overflow:hidden">
            <div style="position:relative;height:22px">${monthHeaderHtml}</div>
            <div style="position:relative;height:20px">${weekHeaderHtml}</div>
          </div>
        </th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  </body></html>`;

  const win=window.open('','_blank'); win.document.write(html); win.document.close();
  notif('Gantt PDF ready — click Print in new window');
}

function exportCSV(){
  const today = new Date().toISOString().slice(0,10);
  const escape = text => `"${String(text).replace(/"/g, '""')}"`;
  const bucketMap = {}; state.buckets.forEach(b => bucketMap[b.id] = b);

  const projHeader = [ 'Bucket','Project Name','PIC','Status','Start Date','Due Date','Budget','Spent','Variance','Monthly Saving' ].join(',');
  const projRows = state.projects.map(p => {
    const fin = p.finance || {};
    return [
      bucketMap[p.bucketId]?.name||'', p.name, p.pic||'', p.status, p.startDate||'', p.dueDate||'',
      fin.budget||'', fin.actualInvest||'', (Number(fin.budget||0)-Number(fin.actualInvest||0)), fin.monthlySaving||''
    ].map(escape).join(',');
  });

  const taskHeader = [ 'Bucket Context','Parent Project','Task Action Item','PIC Assigned','Status State','Start Constraint','Due Milestone' ].join(',');
  const taskRows = state.projects.flatMap(p => 
    p.tasks.map(t => [ bucketMap[p.bucketId]?.name||'', p.name, t.name, t.pic||'', t.status, t.startDate||'', t.dueDate||'' ].map(escape).join(','))
  );

  const csv = [
    `PlanBoard Pro - Status Report - ${today}`, '', '=== PROJECTS ===', projHeader, ...projRows, '', '=== TASKS BREAKDOWN ===', taskHeader, ...taskRows
  ].join('\n');

  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `planboard_report_${today}.csv`; a.click();
  notif('CSV report downloaded!');
}

function exportJSON(){
  const data = { version: 3, buckets: state.buckets, globalTags: state.globalTags, projects: state.projects, nextId: state.nextId, todoTasks: state.todoTasks || [] };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `planboard_msproject_${new Date().toISOString().slice(0,10)}.json`; a.click();
}

function triggerImport(){ document.getElementById('importFile').click(); }

document.getElementById('importFile').addEventListener('change', function(){
  const file = this.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try {
      const data = JSON.parse(e.target.result);
      state.buckets = data.buckets || state.buckets;
      state.globalTags = data.globalTags || [];
      state.projects = data.projects || state.projects;
      state.nextId = data.nextId || state.nextId;
      state.todoTasks = data.todoTasks || [];
      state.selectedBucketId = state.buckets[0]?.id || 1;
      state.selectedProjectId = null;
      state.currentPage = 'projects';
      saveLocal(); render(); notif('Database restored successfully');
    } catch(err){ notif('Invalid JSON profile format','error'); }
  };
  reader.readAsText(file);
});

// ========== MS PROJECT INTERACTION CORE LAYOUT SYNC ==========
function syncWorkspaceScrolling(){
  const tableSide = document.getElementById('msProjectTableSideScroll');
  const ganttSide = document.getElementById('msProjectGanttSideScroll');
  if(!tableSide || !ganttSide) return;

  let syncingFromTable = false;
  let syncingFromGantt = false;

  tableSide.addEventListener('scroll', () => {
    if(syncingFromGantt) return;
    syncingFromTable = true;
    ganttSide.scrollTop = tableSide.scrollTop;
    requestAnimationFrame(() => { syncingFromTable = false; });
  });

  ganttSide.addEventListener('scroll', () => {
    if(syncingFromTable) return;
    syncingFromGantt = true;
    tableSide.scrollTop = ganttSide.scrollTop;
    requestAnimationFrame(() => { syncingFromGantt = false; });
  });
}

function enableColumnResize(){
  document.querySelectorAll('.data-table th .resizer').forEach(resizer => {
    resizer.addEventListener('mousedown', function(e) {
      e.preventDefault();
      const colId = resizer.dataset.col;
      const th = resizer.parentElement;
      const startWidth = th.offsetWidth;
      const startX = e.pageX;

      function onMouseMove(moveEvent) {
        const width = Math.max(50, startWidth + (moveEvent.pageX - startX));
        th.style.width = width + 'px';
        columnWidths[colId] = width;
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });
}

// ========== ADVANCED WEB drag-and-drop BOARD MANAGER SYSTEM ==========
let dnd = { type: null, id: null, fromBucketId: null };

function setupDragAndDrop(){
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      dnd.type = 'project'; dnd.id = +card.dataset.projectCardId;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.getElementById('projectGridContainer')?.classList.remove('drag-active');
      document.querySelectorAll('.bucket-item').forEach(el=>el.classList.remove('bucket-drop-target'));
      dnd = { type: null, id: null, fromBucketId: null };
    });
  });

  document.querySelectorAll('[data-project-card-id]').forEach(targetCard => {
    targetCard.addEventListener('dragover', e => {
      if(dnd.type !== 'project' || dnd.id === +targetCard.dataset.projectCardId) return;
      e.preventDefault();
    });
    targetCard.addEventListener('drop', e => {
      e.preventDefault();
      if(dnd.type !== 'project' || dnd.id === +targetCard.dataset.projectCardId) return;
      const draggedProj = state.projects.find(p=>p.id === dnd.id);
      const targetProj = state.projects.find(p=>p.id === +targetCard.dataset.projectCardId);
      if(!draggedProj || !targetProj) return;

      draggedProj.bucketId = targetProj.bucketId;
      const fromIdx = state.projects.indexOf(draggedProj);
      const toIdx = state.projects.indexOf(targetProj);
      state.projects.splice(fromIdx, 1);
      state.projects.splice(toIdx, 0, draggedProj);
      saveLocal(); render(); notif('Project reordered');
    });
  });

  document.querySelectorAll('[data-bucket-drag-id]').forEach(bItem => {
    const bid = +bItem.dataset.bucketDragId;
    bItem.addEventListener('dragover', e => {
      if(dnd.type !== 'project' && dnd.type !== 'bucket') return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      if(dnd.type === 'project') bItem.classList.add('bucket-drop-target');
    });
    bItem.addEventListener('dragleave', () => { bItem.classList.remove('bucket-drop-target'); });
    bItem.addEventListener('drop', e => {
      e.preventDefault(); bItem.classList.remove('bucket-drop-target');
      if(dnd.type === 'project') {
        const p = state.projects.find(x => x.id === dnd.id);
        if(p && p.bucketId !== bid) {
          p.bucketId = bid; saveLocal(); render(); notif(`Project routed to new bucket!`);
        }
      } else if(dnd.type === 'bucket' && dnd.id !== bid) {
        const fromIdx = state.buckets.findIndex(x=>x.id === dnd.id);
        const toIdx = state.buckets.findIndex(x=>x.id === bid);
        if(fromIdx!==-1 && toIdx!==-1){
          const target = state.buckets[fromIdx];
          state.buckets.splice(fromIdx,1); state.buckets.splice(toIdx,0,target);
          saveLocal(); render(); notif('Buckets reordered');
        }
      }
    });
    bItem.addEventListener('dragstart', e => {
      dnd.type = 'bucket'; dnd.id = bid; bItem.classList.add('dragging');
    });
    bItem.addEventListener('dragend', () => {
      bItem.classList.remove('dragging'); dnd = { type: null, id: null, fromBucketId: null };
    });
  });

  document.querySelectorAll('[data-tag-drag-id]').forEach(tItem => {
    const tid = +tItem.dataset.tagDragId;
    tItem.addEventListener('dragstart', e => {
      dnd.type = 'tag'; dnd.id = tid; tItem.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    tItem.addEventListener('dragend', () => {
      tItem.classList.remove('dragging');
      document.querySelectorAll('.tag-item-manage.drag-over').forEach(el => el.classList.remove('drag-over'));
      dnd = { type: null, id: null, fromBucketId: null };
    });
    tItem.addEventListener('dragover', e => {
      if(dnd.type !== 'tag' || dnd.id === tid) return; e.preventDefault();
    });
    tItem.addEventListener('dragenter', e => {
      if(dnd.type !== 'tag' || dnd.id === tid) return; e.preventDefault(); tItem.classList.add('drag-over');
    });
    tItem.addEventListener('dragleave', () => { tItem.classList.remove('drag-over'); });
    tItem.addEventListener('drop', e => {
      e.preventDefault(); tItem.classList.remove('drag-over');
      if(dnd.type !== 'tag' || dnd.id === tid) return;
      const fromIdx = state.globalTags.findIndex(t => t.id === dnd.id);
      const toIdx = state.globalTags.findIndex(t => t.id === tid);
      if(fromIdx === -1 || toIdx === -1) return;

      const target = state.globalTags[fromIdx];
      state.globalTags.splice(fromIdx,1); state.globalTags.splice(toIdx,0,target);
      saveLocal(); render(); notif('Global tags reordered');
    });
  });
}

// ========== INITIAL LANDING APP RENDER GENERATION ==========
render();
