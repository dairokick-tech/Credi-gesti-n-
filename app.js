let supabaseClient, user=null, db={clientes:[],creditos:[],pagos:[],caja:[]}, currentPage='dashboard';
const cfg=window.CREDI_CONFIG||{};
const money=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2});
const num=v=>Number(v||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today=()=>new Date().toISOString().slice(0,10);
const calcTotal=(m,i)=>Math.round(num(m)*(1+num(i)/100)*100)/100;
const addDays=(date,days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)};
const step=(f)=>f==='Diaria'?1:f==='Semanal'?7:f==='Quincenal'?15:30;
const clientName=id=>(db.clientes.find(x=>x.id===id)||{}).nombre||'—';
function showAlert(msg,error=false){const a=document.getElementById('alert');a.textContent=msg;a.className='alert '+(error?'error':'');setTimeout(()=>a.classList.add('hidden'),3500)}
function showMsg(msg,error=false){const e=document.getElementById('loginMsg');e.textContent=msg;e.className='msg '+(error?'error':'')}
function setPage(p){currentPage=p;document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===p));render()}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>setPage(b.dataset.page));
function scheduleFor(c){const total=calcTotal(c.monto,c.interes), base=Math.floor(total/c.cuotas*100)/100;let rest=total,rows=[];for(let i=1;i<=c.cuotas;i++){const importe=i===c.cuotas?Math.round(rest*100)/100:base;rest=Math.round((rest-importe)*100)/100;rows.push({n:i,fecha:addDays(c.fecha_desembolso,step(c.frecuencia)*i),importe})}return rows}
function paidForCredit(id){return db.pagos.filter(p=>p.credito_id===id).reduce((s,p)=>s+num(p.monto),0)}
function creditState(c){const total=calcTotal(c.monto,c.interes),paid=paidForCredit(c.id);if(total-paid<=0.005)return 'Cancelado';const overdue=scheduleFor(c).some(r=>r.fecha<today() && db.pagos.filter(p=>p.credito_id===c.id&&p.cuota===r.n).reduce((s,p)=>s+num(p.monto),0)<r.importe-0.005);return overdue?'Vencido':'Activo'}
function saveData(){
  localStorage.setItem('credi_gestion_db', JSON.stringify(db));
}
function loadData(){
  try{
    const raw=localStorage.getItem('credi_gestion_db');
    if(raw){
      const parsed=JSON.parse(raw);
      db={
        clientes:Array.isArray(parsed.clientes)?parsed.clientes:[],
        creditos:Array.isArray(parsed.creditos)?parsed.creditos:[],
        pagos:Array.isArray(parsed.pagos)?parsed.pagos:[],
        caja:Array.isArray(parsed.caja)?parsed.caja:[]
      };
    }
  }catch(e){
    console.warn('No se pudo leer la información local.',e);
  }
  render();
}
function uid(){
  if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();
  return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
}
function addLocal(table,row){
  db[table].push(row);
  saveData();
}
function render(){const titles={dashboard:['Dashboard','Resumen general de tu cartera'],clientes:['Clientes','Registro e historial de clientes'],creditos:['Créditos','Administración de créditos y cronogramas'],cobranza:['Cobranza','Pagos, cuotas y vencimientos'],caja:['Caja','Ingresos y movimientos'],reportes:['Reportes','Indicadores y exportación']};document.getElementById('title').textContent=titles[currentPage][0];document.getElementById('subtitle').textContent=titles[currentPage][1];document.getElementById('content').innerHTML=({dashboard,clientes,creditos,cobranza,caja,reportes}[currentPage])()}
function dashboard(){const cartera=db.creditos.reduce((s,c)=>s+Math.max(0,calcTotal(c.monto,c.interes)-paidForCredit(c.id)),0),cob=db.pagos.reduce((s,p)=>s+num(p.monto),0),v=db.creditos.filter(c=>creditState(c)==='Vencido').reduce((s,c)=>s+Math.max(0,calcTotal(c.monto,c.interes)-paidForCredit(c.id)),0),due=db.creditos.flatMap(c=>scheduleFor(c).filter(r=>r.fecha<today()&&db.pagos.filter(p=>p.credito_id===c.id&&p.cuota===r.n).reduce((s,p)=>s+num(p.monto),0)<r.importe-0.005)).length;return `<div class="cards"><div class="card"><div class="label">Cartera pendiente</div><div class="value">${money(cartera)}</div></div><div class="card"><div class="label">Créditos activos</div><div class="value">${db.creditos.filter(c=>creditState(c)==='Activo').length}</div></div><div class="card"><div class="label">Cobrado</div><div class="value">${money(cob)}</div></div><div class="card"><div class="label">Cuotas vencidas</div><div class="value">${due}</div><div class="trend">${money(v)} pendiente vencido</div></div></div><div class="grid2"><div class="panel"><div class="panel-head"><h2>Últimos créditos</h2><button class="secondary" onclick="setPage('creditos')">Ver todos</button></div>${creditTable(5)}</div><div class="panel"><div class="panel-head"><h2>Últimos pagos</h2><button class="secondary" onclick="setPage('cobranza')">Ver todos</button></div>${paymentTable(5)}</div></div>`}
function creditTable(limit=100){const a=db.creditos.slice(-limit).reverse();if(!a.length)return '<div class="empty">No hay créditos registrados.</div>';return `<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Capital</th><th>Total</th><th>Saldo</th><th>Cuotas</th><th>Estado</th><th></th></tr></thead><tbody>${a.map(c=>{const total=calcTotal(c.monto,c.interes),saldo=Math.max(0,total-paidForCredit(c.id)),st=creditState(c);return `<tr class="${st==='Vencido'?'danger-row':''}"><td>${esc(clientName(c.cliente_id))}</td><td>${money(c.monto)}</td><td>${money(total)}</td><td>${money(saldo)}</td><td>${c.cuotas} · ${esc(c.frecuencia)}</td><td><span class="badge ${st==='Vencido'?'danger':st==='Cancelado'?'blue':'ok'}">${st}</span></td><td class="actions"><button onclick="viewSchedule('${c.id}')">Cronograma</button>${saldo>0?`<button onclick="openPayment('${c.id}')">Cobrar</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`}
function paymentTable(limit=100){const a=db.pagos.slice(-limit).reverse();if(!a.length)return '<div class="empty">No hay pagos registrados.</div>';return `<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Crédito</th><th>Fecha</th><th>Pago</th><th>Cuota</th></tr></thead><tbody>${a.map(p=>`<tr><td>${esc(clientName((db.creditos.find(x=>x.id===p.credito_id)||{}).cliente_id))}</td><td>#${p.credito_id.slice(0,8)}</td><td>${esc(p.fecha)}</td><td>${money(p.monto)}</td><td>#${p.cuota}</td></tr>`).join('')}</tbody></table></div>`}
function clientes(){return `<div class="panel"><div class="panel-head"><h2>Clientes (${db.clientes.length})</h2><div class="toolbar"><input class="search" id="clientSearch" placeholder="Buscar DNI, nombre o teléfono" oninput="filterClients()"><button class="primary" onclick="openClient()">+ Cliente</button></div></div><div id="clientsTable">${clientsTable()}</div></div>`}
function clientsTable(list=db.clientes){if(!list.length)return '<div class="empty">No hay clientes registrados.</div>';return `<div class="table-wrap"><table><thead><tr><th>DNI</th><th>Cliente</th><th>Teléfono</th><th>Dirección</th><th></th></tr></thead><tbody>${list.map(c=>`<tr><td>${esc(c.dni)}</td><td>${esc(c.nombre)}</td><td>${esc(c.telefono)}</td><td>${esc(c.direccion)}</td><td class="actions"><button onclick="openCredit('${c.id}')">Nuevo crédito</button><button onclick="clientHistory('${c.id}')">Historial</button></td></tr>`).join('')}</tbody></table></div>`}
function filterClients(){const q=(document.getElementById('clientSearch')?.value||'').toLowerCase();document.getElementById('clientsTable').innerHTML=clientsTable(db.clientes.filter(c=>(c.dni+' '+c.nombre+' '+c.telefono).toLowerCase().includes(q)))}
function creditos(){return `<div class="panel"><div class="panel-head"><h2>Portafolio (${db.creditos.length})</h2><div class="toolbar"><button class="secondary" onclick="exportCSV('creditos')">Exportar CSV</button><button class="primary" onclick="openCredit()">+ Nuevo crédito</button></div></div>${creditTable()}</div>`}
function cobranza(){const due=db.creditos.flatMap(c=>scheduleFor(c).filter(r=>r.fecha<=today()&&db.pagos.filter(p=>p.credito_id===c.id&&p.cuota===r.n).reduce((s,p)=>s+num(p.monto),0)<r.importe-0.005).map(r=>({...r,c})));return `<div class="panel"><div class="panel-head"><h2>Cuotas pendientes</h2><div class="toolbar"><button class="secondary" onclick="exportCSV('pagos')">Exportar pagos</button><button class="primary" onclick="openPayment()">+ Registrar pago</button></div></div>${due.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Cuota</th><th>Vencimiento</th><th>Importe</th><th>Estado</th><th></th></tr></thead><tbody>${due.map(x=>`<tr><td>${esc(clientName(x.c.cliente_id))}</td><td>#${x.n}</td><td>${x.fecha}</td><td>${money(x.importe)}</td><td><span class="badge ${x.fecha<today()?'danger':'warn'}">${x.fecha<today()?'Vencida':'Vence hoy'}</span></td><td><button class="secondary" onclick="openPayment('${x.c.id}',${x.n})">Cobrar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay cuotas vencidas o pendientes para hoy.</div>'}</div><div class="panel"><h2>Pagos registrados</h2>${paymentTable()}</div>`}
function caja(){const cob=db.pagos.reduce((s,p)=>s+num(p.monto),0),ing=db.caja.filter(x=>x.tipo==='Ingreso').reduce((s,x)=>s+num(x.monto),0),eg=db.caja.filter(x=>x.tipo==='Egreso').reduce((s,x)=>s+num(x.monto),0);return `<div class="cards"><div class="card"><div class="label">Cobranza</div><div class="value">${money(cob)}</div></div><div class="card"><div class="label">Ingresos</div><div class="value">${money(ing)}</div></div><div class="card"><div class="label">Egresos</div><div class="value">${money(eg)}</div></div><div class="card"><div class="label">Saldo caja</div><div class="value">${money(cob+ing-eg)}</div></div></div><div class="panel"><div class="panel-head"><h2>Movimientos</h2><button class="primary" onclick="openCash()">+ Movimiento</button></div>${db.caja.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Monto</th></tr></thead><tbody>${db.caja.slice().reverse().map(x=>`<tr><td>${x.fecha}</td><td>${x.tipo}</td><td>${esc(x.concepto)}</td><td>${money(x.monto)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Sin movimientos.</div>'}</div>`}
function reportes(){const capital=db.creditos.reduce((s,c)=>s+num(c.monto),0),saldo=db.creditos.reduce((s,c)=>s+Math.max(0,calcTotal(c.monto,c.interes)-paidForCredit(c.id)),0),cob=db.pagos.reduce((s,p)=>s+num(p.monto),0);return `<div class="cards"><div class="card"><div class="label">Capital colocado</div><div class="value">${money(capital)}</div></div><div class="card"><div class="label">Saldo cartera</div><div class="value">${money(saldo)}</div></div><div class="card"><div class="label">Cobrado</div><div class="value">${money(cob)}</div></div><div class="card"><div class="label">Clientes</div><div class="value">${db.clientes.length}</div></div></div><div class="panel"><div class="panel-head"><h2>Exportación</h2><div class="toolbar"><button class="secondary" onclick="exportCSV('clientes')">Clientes CSV</button><button class="secondary" onclick="exportCSV('creditos')">Créditos CSV</button><button class="secondary" onclick="exportCSV('pagos')">Pagos CSV</button></div></div><p class="muted">Los datos están almacenados en Supabase y protegidos por políticas RLS para que cada usuario vea únicamente sus registros.</p></div>`}
function modal(title,html,onSubmit){document.getElementById('modalTitle').textContent=title;const f=document.getElementById('modalForm');f.innerHTML=html;f.onsubmit=onSubmit?async e=>{e.preventDefault();try{await onSubmit(Object.fromEntries(new FormData(f).entries()))}catch(err){showAlert(err.message||'Ocurrió un error.',true)}}:null;document.getElementById('modal').classList.remove('hidden')}
function closeModal(){document.getElementById('modal').classList.add('hidden')}
function openClient(){modal('Nuevo cliente',`<label>DNI<input name="dni" inputmode="numeric" maxlength="8" required></label><label>Nombre completo<input name="nombre" required></label><label>Teléfono<input name="telefono" inputmode="tel" maxlength="15"></label><label>Dirección<input name="direccion"></label><button class="primary">Guardar cliente</button>`,async d=>{if(!/^\d{8}$/.test(d.dni))throw Error('El DNI debe tener 8 dígitos.');addLocal('clientes',{id:uid(),dni:d.dni,nombre:d.nombre,telefono:d.telefono||'',direccion:d.direccion||'',created_at:new Date().toISOString()});closeModal();loadData();showAlert('Cliente registrado correctamente.')})}
function openCredit(clientId){if(!db.clientes.length){showAlert('Primero registra un cliente.',true);setPage('clientes');return}const opts=db.clientes.map(c=>`<option value="${c.id}" ${c.id===clientId?'selected':''}>${esc(c.nombre)} — ${esc(c.dni)}</option>`).join('');modal('Nuevo crédito',`<label class="full">Cliente<select name="cliente_id" required>${opts}</select></label><label>Monto (S/)<input name="monto" type="number" min="0.01" step="0.01" required></label><label>Interés (%)<input name="interes" type="number" min="0" step="0.01" value="20" required></label><label>Cuotas<input name="cuotas" type="number" min="1" max="240" value="12" required></label><label>Frecuencia<select name="frecuencia"><option>Diaria</option><option>Semanal</option><option>Quincenal</option><option selected>Mensual</option></select></label><label>Desembolso<input name="fecha_desembolso" type="date" value="${today()}" required></label><button class="primary">Crear crédito</button>`,async d=>{const monto=num(d.monto),interes=num(d.interes),cuotas=parseInt(d.cuotas);if(monto<=0||interes<0||cuotas<1)throw Error('Revisa los datos.');addLocal('creditos',{id:uid(),cliente_id:d.cliente_id,monto,interes,cuotas,frecuencia:d.frecuencia,fecha_desembolso:d.fecha_desembolso,created_at:new Date().toISOString()});closeModal();loadData();showAlert('Crédito creado correctamente.')})}
function openPayment(creditId,quotaNo){const eligible=db.creditos.filter(c=>Math.max(0,calcTotal(c.monto,c.interes)-paidForCredit(c.id))>0.005);if(!eligible.length){showAlert('No hay créditos con saldo pendiente.',true);return}const opts=eligible.map(c=>`<option value="${c.id}" ${c.id===creditId?'selected':''}>${esc(clientName(c.cliente_id))} · saldo ${money(Math.max(0,calcTotal(c.monto,c.interes)-paidForCredit(c.id)))}</option>`).join('');modal('Registrar pago',`<label class="full">Crédito<select name="credito_id" required>${opts}</select></label><label>Cuota<input name="cuota" type="number" min="1" value="${quotaNo||1}" required></label><label>Monto (S/)<input name="monto" type="number" min="0.01" step="0.01" required></label><label>Fecha<input name="fecha" type="date" value="${today()}" required></label><label class="full">Observación<input name="observacion"></label><button class="primary">Registrar pago</button>`,async d=>{const c=db.creditos.find(x=>x.id===d.credito_id),m=Math.round(num(d.monto)*100)/100;if(!c||m<=0)throw Error('Monto inválido.');const saldo=Math.max(0,calcTotal(c.monto,c.interes)-paidForCredit(c.id));if(m>saldo+0.005)throw Error('El pago supera el saldo pendiente.');addLocal('pagos',{id:uid(),credito_id:c.id,cuota:Math.max(1,parseInt(d.cuota)),monto:m,fecha:d.fecha,observacion:d.observacion||'',created_at:new Date().toISOString()});closeModal();loadData();showAlert('Pago registrado correctamente.')})}
function viewSchedule(id){const c=db.creditos.find(x=>x.id===id);if(!c)return;const rows=scheduleFor(c);modal('Cronograma',`<p><b>${esc(clientName(c.cliente_id))}</b> · Total ${money(calcTotal(c.monto,c.interes))} · Saldo ${money(Math.max(0,calcTotal(c.monto,c.interes)-paidForCredit(c.id)))}</p><div class="table-wrap full"><table><thead><tr><th>Cuota</th><th>Vence</th><th>Importe</th><th>Pagado</th><th>Estado</th></tr></thead><tbody>${rows.map(r=>{const p=db.pagos.filter(x=>x.credito_id===id&&x.cuota===r.n).reduce((s,x)=>s+num(x.monto),0),done=p>=r.importe-0.005;return `<tr><td>#${r.n}</td><td>${r.fecha}</td><td>${money(r.importe)}</td><td>${money(p)}</td><td><span class="badge ${done?'ok':r.fecha<today()?'danger':'warn'}">${done?'Pagada':r.fecha<today()?'Vencida':'Pendiente'}</span></td></tr>`}).join('')}</tbody></table></div><button type="button" class="secondary" onclick="closeModal()">Cerrar</button>`,null)}
function clientHistory(id){const c=db.clientes.find(x=>x.id===id);if(!c)return;const credits=db.creditos.filter(x=>x.cliente_id===id);modal('Historial',`<p><b>${esc(c.nombre)}</b> · DNI ${esc(c.dni)}</p>${credits.map(x=>`<div class="mini">Crédito ${x.id.slice(0,8)} · ${money(x.monto)} · saldo ${money(Math.max(0,calcTotal(x.monto,x.interes)-paidForCredit(x.id)))} · ${creditState(x)}</div>`).join('')||'<p class="muted">Sin créditos.</p>'}<button type="button" class="secondary" onclick="closeModal()">Cerrar</button>`,null)}
function openCash(){modal('Movimiento de caja',`<label>Tipo<select name="tipo"><option>Ingreso</option><option>Egreso</option></select></label><label>Monto<input name="monto" type="number" min="0.01" step="0.01" required></label><label>Fecha<input name="fecha" type="date" value="${today()}" required></label><label class="full">Concepto<input name="concepto" required></label><button class="primary">Guardar</button>`,async d=>{const m=Math.round(num(d.monto)*100)/100;if(m<=0)throw Error('Monto inválido.');addLocal('caja',{id:uid(),tipo:d.tipo,monto:m,fecha:d.fecha,concepto:d.concepto,created_at:new Date().toISOString()});closeModal();loadData();showAlert('Movimiento registrado.')})}
function exportBackup(){
  const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='credi-gestion-respaldo.json';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function importBackup(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const x=JSON.parse(reader.result);
      if(!x||!Array.isArray(x.clientes)||!Array.isArray(x.creditos)||!Array.isArray(x.pagos)||!Array.isArray(x.caja))throw Error('Formato de respaldo inválido.');
      db=x; saveData(); render(); showAlert('Respaldo restaurado correctamente.');
    }catch(e){showAlert(e.message||'No se pudo restaurar el respaldo.',true)}
  };
  reader.readAsText(file);
}
function exportCSV(type){let rows;if(type==='clientes')rows=[['DNI','Nombre','Telefono','Direccion'],...db.clientes.map(c=>[c.dni,c.nombre,c.telefono,c.direccion])];else if(type==='creditos')rows=[['ID','Cliente','Monto','Interes','Cuotas','Frecuencia','Desembolso','Total','Saldo','Estado'],...db.creditos.map(c=>[c.id,clientName(c.cliente_id),c.monto,c.interes,c.cuotas,c.frecuencia,c.fecha_desembolso,calcTotal(c.monto,c.interes),Math.max(0,calcTotal(c.monto,c.interes)-paidForCredit(c.id)),creditState(c)])];else rows=[['ID','Credito','Cliente','Fecha','Cuota','Monto','Observacion'],...db.pagos.map(p=>[p.id,p.credito_id,clientName((db.creditos.find(c=>c.id===p.credito_id)||{}).cliente_id),p.fecha,p.cuota,p.monto,p.observacion])];const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=type+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function init(){
  user={local:true};
  document.getElementById('userEmail').textContent='Modo local';
  loadData();
}
document.getElementById('resetDataBtn')?.addEventListener('click',()=>{
  if(confirm('¿Borrar todos los clientes, créditos, pagos y movimientos de este dispositivo?')){
    db={clientes:[],creditos:[],pagos:[],caja:[]};
    saveData();
    render();
    showAlert('Todos los datos locales fueron borrados.');
  }
});
init();
