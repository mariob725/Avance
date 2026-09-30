const $ = id => document.getElementById(id);
const DAY_MS=86400000;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => '$' + (isFinite(n)?n:0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

function serviceSpan(start,end){
  if(end<start) return null;
  let years=end.getFullYear()-start.getFullYear();
  let months=end.getMonth()-start.getMonth();
  let days=end.getDate()-start.getDate();
  if(days<0){months-=1; days+=new Date(end.getFullYear(),end.getMonth(),0).getDate();}
  if(months<0){years-=1; months+=12;}
  const totalDays=Math.round((end-start)/86400000);
  const lastAnniv=new Date(start); lastAnniv.setFullYear(start.getFullYear()+years);
  const daysSinceAnniv=Math.max(0,Math.round((end-lastAnniv)/86400000));
  return {years,months,days,totalDays,fraction:(months*30+days)/360};
}
function aguinaldoDias(years){ return years>=10?21:years>=3?19:15; }

// ---- Calendario de asuetos (Art. 190 C.T.) ----
// Domingo de Pascua por el algoritmo de Gauss/Anónimo (calendario gregoriano)
function domingoPascua(year){
  const a=year%19, b=Math.floor(year/100), c=year%100, d=Math.floor(b/4), e=b%4;
  const f=Math.floor((b+8)/25), g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451);
  const mes=Math.floor((h+l-7*m+114)/31), dia=((h+l-7*m+114)%31)+1;
  return new Date(year,mes-1,dia);
}
function nationalAsuetos(year, municipio, fechaPatronal){
  const pascua=domingoPascua(year);
  const day=n=>new Date(pascua.getFullYear(),pascua.getMonth(),pascua.getDate()+n);
  const list=[
    {date:new Date(year,0,1), label:'Año Nuevo'},
    {date:day(-3), label:'Jueves Santo'},
    {date:day(-2), label:'Viernes Santo'},
    {date:day(-1), label:'Sábado Santo'},
    {date:new Date(year,4,1), label:'Día del Trabajo'},
    {date:new Date(year,4,10), label:'Día de la Madre'},
    {date:new Date(year,5,17), label:'Día del Padre'},
    {date:new Date(year,7,6), label:'Día del Divino Salvador del Mundo'},
    {date:new Date(year,8,15), label:'Independencia de El Salvador'},
    {date:new Date(year,10,2), label:'Día de los Difuntos'},
    {date:new Date(year,11,25), label:'Navidad'},
  ];
  if(municipio==='SS'){
    list.push({date:new Date(year,7,3), label:'Fiestas patronales de San Salvador'});
    list.push({date:new Date(year,7,5), label:'Fiestas patronales de San Salvador'});
  } else if(municipio==='SM'){
    list.push({date:new Date(year,10,21), label:'Fiestas patronales de San Miguel (Virgen de la Paz)'});
  } else if(municipio==='otro' && fechaPatronal && !isNaN(fechaPatronal)){
    list.push({date:new Date(year,fechaPatronal.getMonth(),fechaPatronal.getDate()), label:'Fiestas patronales de tu municipio'});
  }
  return list.sort((a,b)=>a.date-b.date);
}
let asuetoChecked=new Set();
function refreshAsuetoList(){
  const ing=parseLocal($('ingreso').value), fin=parseLocal($('fin').value);
  const box=$('asuetoBox');
  if(isNaN(ing)||isNaN(fin)||fin<ing){ box.innerHTML='<div class="empty">Completa las fechas de ingreso y finalización para ver los asuetos del período.</div>'; return; }
  const muni=$('municipio').value, fp=parseLocal($('fechaPatronal').value);
  const finInc=new Date(fin.getFullYear(),fin.getMonth(),fin.getDate()+1);
  const years=new Set([ing.getFullYear(),fin.getFullYear()]);
  let dates=[];
  years.forEach(y=>dates=dates.concat(nationalAsuetos(y,muni,fp)));
  dates=dates.filter(a=>a.date>=ing && a.date<finInc).sort((a,b)=>a.date-b.date);
  if(!dates.length){ box.innerHTML='<div class="empty">No hay fechas de asueto dentro del período trabajado.</div>'; return; }
  box.innerHTML=dates.map(a=>{
    const id='au_'+a.date.getTime();
    const chk=asuetoChecked.has(id)?'checked':'';
    return `<label><input type="checkbox" class="asueto-chk" id="${id}" ${chk}><span>${a.label}</span><span class="d">${a.date.toLocaleDateString('es-SV',{day:'2-digit',month:'short',year:'numeric'})}</span></label>`;
  }).join('');
}
// fracción de año en meses comerciales (30 días), como el ejemplo del Ministerio/juzgados
const frac=(a,b)=>{const s=serviceSpan(a,b); return s?Math.min(1,(s.years*360+s.months*30+s.days)/360):0;};

// ---- número a letras (USD) ----
const UNI=['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte'];
const DEC=['','','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
const CEN=['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
function tresDigitos(n){
  if(n===0) return '';
  if(n===100) return 'cien';
  let s='';
  const c=Math.floor(n/100), r=n%100;
  if(c) s+=CEN[c]+' ';
  if(r<=20) s+=UNI[r];
  else{
    const d=Math.floor(r/10), u=r%10;
    s+=DEC[d]+(u?' y '+UNI[u]:'');
  }
  return s.trim();
}
function enteroALetras(n){
  if(n===0) return 'cero';
  let out=[];
  const millones=Math.floor(n/1000000); n%=1000000;
  const miles=Math.floor(n/1000); n%=1000;
  if(millones) out.push(millones===1?'un millón':tresDigitos(millones)+' millones');
  if(miles) out.push(miles===1?'mil':tresDigitos(miles)+' mil');
  if(n) out.push(tresDigitos(n));
  return out.join(' ').trim();
}
function montoALetras(valor){
  const entero=Math.floor(valor+1e-6);
  const centavos=Math.round((valor-entero)*100);
  const cad=entero===1?'un dólar':enteroALetras(entero)+' dólares';
  return (cad.charAt(0).toUpperCase()+cad.slice(1))+' con '+String(centavos).padStart(2,'0')+'/100 US$';
}

function isr(base){
  if(base<=550) return 0;
  if(base<=895.24) return (base-550)*0.10+17.67;
  if(base<=2038.10) return (base-895.24)*0.20+60.00;
  return (base-2038.10)*0.30+288.57;
}

// Cada causal define cómo se calcula la indemnización y si corresponde vacación proporcional.
const CAUSALES={
  injustificado:{tipo:'art58',vac:true,base:'Arts. 55 y 58 C.T.',nota:'Los recargos por jornadas especiales pendientes se pagan además de la indemnización.'},
  plazo_injust:{tipo:'art59',vac:true,base:'Art. 59 C.T.',nota:'Aplica solo a contratos a plazo válidos (Art. 25 C.T.).'},
  retiro_justificado:{tipo:'art58',vac:true,base:'Arts. 53 y 56 C.T. (se indemniza como si hubiera sido despedido)',nota:'Debe existir una causa del Art. 53 (rebaja de salario, malos tratos, peligro para la salud, etc.); si el patrono la discute, decide un juez.'},
  renuncia:{tipo:'renuncia',vac:true,nota:'La prestación por renuncia requiere preaviso escrito de 15 días (30 días si es cargo de dirección, jefatura o trabajador especializado) y al menos 2 años de servicio continuo.'},
  despido_justificado:{tipo:'ninguna',vac:false,base:'Art. 50 C.T.: causas justificadas, sin responsabilidad para el patrono',nota:'El aguinaldo proporcional se paga aunque el despido sea disciplinario (Art. 201 C.T.).'},
  mutuo:{tipo:'ninguna',vac:false,base:'Art. 54 C.T.: sin responsabilidad para las partes; el acuerdo debe constar por escrito',nota:'Si acordaron una bonificación, se suma aparte; este cálculo no la incluye.'},
  vencimiento:{tipo:'ninguna',vac:false,base:'Art. 48 ord. 1 C.T.: cumplimiento del plazo',nota:'Si fue obra determinada de más de 15 días, verifica el aviso de 7 días del Art. 26 C.T.; sin aviso corresponde pagar 7 días de salario.'},
  prueba:{tipo:'ninguna',vac:false,base:'Art. 28 C.T.: dentro de los primeros 30 días, sin expresión de causa'},
  fuerza_mayor:{tipo:'ninguna',vac:false,base:'Art. 48 ord. 6 C.T.: siempre que sus consecuencias no sean imputables al patrono'},
  cierre:{tipo:'ninguna',vac:false,base:'Arts. 48 ords. 5 y 7 y 49 C.T.',nota:'El cierre por incosteabilidad requiere sentencia del Juez de Trabajo (Art. 49).'},
  muerte:{tipo:'ninguna',vac:false,base:'Art. 48 ord. 2 C.T.',nota:'Las prestaciones se entregan a los beneficiarios del trabajador fallecido.'},
  otra48:{tipo:'ninguna',vac:false,base:'Art. 48 ords. 3, 4 y 8 C.T.: muerte del patrono, incapacidad o sentencia de prisión'}
};
let tocado=false;
const parseLocal=v=>{ if(!v) return new Date(NaN); const [y,m,d]=v.split('-').map(Number); return new Date(y,m-1,d); };
function duiOk(v){ const n=v.replace('-',''); let s=0; for(let i=0;i<8;i++) s+=(+n[i])*(9-i); return (10-(s%10))%10===+n[8]; }
function validar(){
  const errs=[], warns=[];
  document.querySelectorAll('.err').forEach(e=>e.classList.remove('err'));
  const bad=(id,msg)=>{ errs.push(msg); if(tocado) $(id).classList.add('err'); };
  if(!$('nombre').value.trim()) bad('nombre','Escribe el nombre del trabajador(a).');
  const dui=$('dui').value.trim();
  if(!/^\d{8}-\d$/.test(dui)) bad('dui','El DUI debe tener el formato 00000000-0.');
  else if(!duiOk(dui)) warns.push('El dígito verificador del DUI no coincide; revisa que esté bien escrito.');
  if(!$('cargo').value.trim()) bad('cargo','Escribe el cargo.');
  if(!$('patrono').value.trim()) bad('patrono','Escribe el nombre del patrono o empresa.');
  const sal=parseFloat($('salario').value), min=parseFloat($('sector').value);
  if(!(sal>0)) bad('salario','Escribe un salario mensual mayor a $0.');
  else if(sal<min) warns.push('El salario es menor al mínimo del sector ('+fmt(min)+'). Verifica que sea correcto.');
  const ing=parseLocal($('ingreso').value), fin=parseLocal($('fin').value);
  if(isNaN(ing)) bad('ingreso','Indica la fecha de ingreso.');
  if(isNaN(fin)) bad('fin','Indica la fecha de finalización.');
  if(!isNaN(ing)&&!isNaN(fin)&&fin<ing) bad('fin','La fecha de finalización no puede ser anterior a la de ingreso.');
  if(!$('motivo').value) bad('motivo','Selecciona la causal de cierre laboral.');
  if($('motivo').value==='plazo_injust'){ const v=parseLocal($('vence').value); if(isNaN(v)) bad('vence','Indica la fecha de vencimiento del contrato.'); else if(!isNaN(fin)&&v<=fin) bad('vence','El vencimiento debe ser posterior a la fecha de finalización.'); }
  if(document.querySelector('input[name="comis"]:checked').value==='si' && !(parseFloat($('comisMonto').value)>0)) bad('comisMonto','Escribe el total de comisiones de los últimos 6 meses.');
  ['hed','hen','asuetoExtra','descanso'].forEach(id=>{ if(parseFloat($(id).value)<0) bad(id,'Las jornadas especiales no pueden ser negativas.'); });
  return {errs,warns};
}

function calcular(){
  const nombre=$('nombre').value, dui=$('dui').value, cargo=$('cargo').value, patrono=$('patrono').value;
  const salario=parseFloat($('salario').value)||0;
  const salMinMensual=parseFloat($('sector').value);
  const ingreso=parseLocal($('ingreso').value), fin=parseLocal($('fin').value);
  const motivo=$('motivo').value;
  const hed=parseFloat($('hed').value)||0, hen=parseFloat($('hen').value)||0;
  const asuetoSi=document.querySelector('input[name="asuetoSi"]:checked').value==='si';
  const dAsueto=asuetoSi ? document.querySelectorAll('.asueto-chk:checked').length + (parseFloat($('asuetoExtra').value)||0) : 0;
  const dDescanso=parseFloat($('descanso').value)||0;
  const box=$('results'), foot=$('footnote');

  const {errs,warns}=validar();
  if(errs.length){
    box.innerHTML = tocado
      ? '<div class="r-row bad"><span>Para calcular, corrige lo siguiente:<span class="detail">'+errs.join('<br>')+'</span></span></div>'
      : '<div class="r-row"><span>Completa los datos para ver el cálculo.</span></div>';
    foot.textContent=''; return null;
  }

  const finInc=new Date(fin.getFullYear(),fin.getMonth(),fin.getDate()+1); // el último día trabajado cuenta
  const span=serviceSpan(ingreso,finInc);
  const radio=n=>document.querySelector('input[name="'+n+'"]:checked').value;
  const vacPrev=radio('vacPrev'), aguiPrev=radio('aguiPrev'), tieneComis=radio('comis')==='si';
  const periodo=parseInt($('periodo').value);
  const comisProm=tieneComis?(parseFloat($('comisMonto').value)||0)/6:0;
  const salDiario=(salario+comisProm)/30;
  const salMinDiario=salMinMensual/30;
  const valorHora=salDiario/8;

  // Prestaciones proporcionales (fracción desde el último aniversario)
  const cz=CAUSALES[motivo];
  const vacProp=cz.vac?salDiario*15*1.30*span.fraction:0;
  const vacPend=vacPrev==='no'?salDiario*15*1.30:0;
  const vacacion=vacProp+vacPend;

  // Reparto de las vacaciones según el período elegido (informativo; el total no cambia)
  const diasVac=(cz.vac?15*span.fraction:0)+(vacPend>0?15:0);
  let resto=diasVac; const partes=[];
  for(let i=0;i<periodo;i++){ const d=i===periodo-1?resto:Math.min([15,10,7][periodo-1],resto); partes.push(d); resto-=d; }
  const periodosTxt=partes.map((d,i)=>`Período ${i+1}: ${d.toFixed(1)} días (${fmt(d*salDiario*1.30)})`).join(' · ');

  // Aguinaldo: año calendario, del 12 de diciembre al 12 de diciembre (Art. 198)
  const dic=y=>new Date(y,11,12), DAY=86400000;
  const finAguiPrev=fin>=dic(fin.getFullYear())?dic(fin.getFullYear()):dic(fin.getFullYear()-1);
  const desdeActual=ingreso>finAguiPrev?ingreso:finAguiPrev;
  const aguiProp=salDiario*aguinaldoDias(span.years)*frac(desdeActual,finInc);
  let aguiPend=0;
  if(aguiPrev==='no' && ingreso<finAguiPrev){
    const ini=dic(finAguiPrev.getFullYear()-1), sp2=serviceSpan(ingreso,finAguiPrev);
    aguiPend=salDiario*aguinaldoDias(sp2.years)*frac(ingreso>ini?ingreso:ini,finAguiPrev);
  }
  const aguinaldo=aguiProp+aguiPend;

  // Indemnización / compensación según la causal
  let indem=0, indemLabel='', indemNota='';
  const art58=()=>{ const b=Math.min(salDiario,4*salMinDiario); return Math.max(b*30*span.years+b*30*span.fraction, b*15); };
  if(cz.tipo==='art58'){
    indem=art58();
    indemLabel = motivo==='retiro_justificado' ? 'Indemnización por retiro justificado' : 'Indemnización por despido injustificado';
    indemNota = (salDiario>4*salMinDiario ? '30 días por año, salario topado a 4× salario mínimo diario ($'+(4*salMinDiario).toFixed(2)+'/día)' : '30 días de salario por cada año de servicio y su fracción, mínimo 15 días')+' — '+cz.base;
  } else if(cz.tipo==='art59'){
    const venc=parseLocal($('vence').value);
    const falta=serviceSpan(finInc,new Date(venc.getFullYear(),venc.getMonth(),venc.getDate()+1));
    const diasFalt=falta?falta.years*360+falta.months*30+falta.days:0;
    indem=Math.min(salDiario*diasFalt, art58());
    indemLabel='Indemnización por despido antes del vencimiento del plazo';
    indemNota='Salario del tiempo que faltaba ('+diasFalt+' días), sin exceder la indemnización de un contrato indefinido — '+cz.base;
  } else if(cz.tipo==='renuncia'){
    indemLabel='Prestación por renuncia voluntaria';
    const avisoNo=document.querySelector('input[name="aviso"]:checked').value==='no';
    if(avisoNo){
      indemNota='No aplica: sin aviso previo por escrito no se calcula la prestación de 15 días por año (Decreto 592).';
    } else if(span.years<2){
      indemNota='No aplica: la Ley Reguladora de la Prestación Económica por Renuncia Voluntaria (Decreto 592) exige un mínimo de 2 años de servicio continuo.';
    } else {
      const baseDiaria=Math.min(salDiario,2*salMinDiario);
      indem=baseDiaria*15*span.years + baseDiaria*15*span.fraction;
      indemNota = (salDiario>2*salMinDiario ? '15 días por año, salario topado a 2× salario mínimo diario ($'+(2*salMinDiario).toFixed(2)+'/día)' : '15 días de salario por cada año de servicio y su fracción')+' — Decreto 592.';
    }
  } else {
    indemLabel='Sin indemnización';
    indemNota=cz.base.replace(/\.$/,'')+'. Solo se pagan las prestaciones proporcionales.';
  }

  // Recargos por jornadas especiales
  const pagoHED=hed*valorHora*2;
  const pagoHEN=hen*valorHora*1.25*2;
  const pagoAsueto=dAsueto*salDiario*2;
  const pagoDescanso=dDescanso*salDiario*1.5;
  const totalRecargos=pagoHED+pagoHEN+pagoAsueto+pagoDescanso;

  const totalPrestaciones=vacacion+aguinaldo+indem;
  const totalDevengado=totalPrestaciones+totalRecargos;

  // Deducciones (aguinaldo, indemnización/renuncia exentos; vacación y recargos gravados)
  const gravable=vacacion+totalRecargos;
  const isssBase=gravable*0.03;
  const isssMonto=Math.min(isssBase,30.00);
  const afpMonto=gravable*0.0725;
  const aguiGravado=Math.max(0,aguinaldo-2*salMinMensual); // exento hasta 2 salarios mínimos mensuales
  const baseISR=Math.max(0,gravable+aguiGravado-isssMonto-afpMonto);
  const isrMonto=isr(baseISR);
  const totalDeducciones=isssMonto+afpMonto+isrMonto;
  const neto=totalDevengado-totalDeducciones;

  box.innerHTML = warns.map(w=>'<div class="r-row warn"><span>'+w+'</span></div>').join('') + `
    <div class="rgroup"><h3>Prestaciones proporcionales</h3>
      <div class="r-row"><span>Tiempo de servicio<span class="detail">${span.years} año(s), ${span.months} mes(es), ${span.days} día(s)</span></span><span class="amount">—</span></div>
      ${comisProm>0?`<div class="r-row"><span>Promedio mensual de comisiones<span class="detail">Se suma al salario base (total de 6 meses ÷ 6)</span></span><span class="amount">${fmt(comisProm)}</span></div>`:''}
      <div class="r-row"><span>Vacación proporcional<span class="detail">${cz.vac?'15 días + 30% recargo, fracción de año en curso':'No aplica en esta causal; solo se paga la vacación de años ya cumplidos'}</span></span><span class="amount">${fmt(vacProp)}</span></div>
      ${vacPend>0?`<div class="r-row"><span>Vacación pendiente del año anterior<span class="detail">15 días + 30% recargo, sin pago previo</span></span><span class="amount">${fmt(vacPend)}</span></div>`:''}
      ${diasVac>0?`<div class="r-row"><span>Reparto por período vacacional<span class="detail">${periodosTxt}</span></span><span class="amount">—</span></div>`:''}
      <div class="r-row"><span>Aguinaldo proporcional<span class="detail">${aguinaldoDias(span.years)} días según antigüedad, desde el 12 de diciembre</span></span><span class="amount">${fmt(aguiProp)}</span></div>
      ${aguiPend>0?`<div class="r-row"><span>Aguinaldo pendiente del año anterior<span class="detail">Sin pago previo</span></span><span class="amount">${fmt(aguiPend)}</span></div>`:''}
      <div class="r-row"><span>${indemLabel}<span class="detail">${indemNota}</span></span><span class="amount">${fmt(indem)}</span></div>
    </div>
    <div class="rgroup"><h3>Recargos por jornadas especiales</h3>
      <div class="r-row"><span>Horas extra diurnas (100%)<span class="detail">${hed} h × ${fmt(valorHora)} × 2</span></span><span class="amount">${fmt(pagoHED)}</span></div>
      <div class="r-row"><span>Horas extra nocturnas<span class="detail">${hen} h, base con 25% nocturnidad × 2</span></span><span class="amount">${fmt(pagoHEN)}</span></div>
      <div class="r-row"><span>Días de asueto trabajados (100%)<span class="detail">${dAsueto} día(s)</span></span><span class="amount">${fmt(pagoAsueto)}</span></div>
      <div class="r-row"><span>Descanso semanal trabajado (50%)<span class="detail">${dDescanso} día(s)</span></span><span class="amount">${fmt(pagoDescanso)}</span></div>
    </div>
    <div class="r-row total"><span>Total devengado (bruto)</span><span class="amount">${fmt(totalDevengado)}</span></div>
    <div class="rgroup"><h3>Deducciones de ley</h3>
      <div class="r-row neg"><span>ISSS (3%, tope $30.00)<span class="detail">sobre remuneración gravada de ${fmt(gravable)}</span></span><span class="amount">-${fmt(isssMonto)}</span></div>
      <div class="r-row neg"><span>AFP (7.25%)</span><span class="amount">-${fmt(afpMonto)}</span></div>
      <div class="r-row neg"><span>ISR<span class="detail">sobre base gravable de ${fmt(baseISR)} tras ISSS y AFP</span></span><span class="amount">-${fmt(isrMonto)}</span></div>
      <div class="r-row neg"><span><b>Total retenciones</b><span class="detail">ISSS + AFP + ISR</span></span><span class="amount">-${fmt(totalDeducciones)}</span></div>
    </div>
    <div class="rgroup"><h3>Resumen del líquido a pagar</h3>
      <div class="r-row"><span>Total devengado (bruto)</span><span class="amount">${fmt(totalDevengado)}</span></div>
      <div class="r-row neg"><span>(−) Total retenciones<span class="detail">ISSS ${fmt(isssMonto)} + AFP ${fmt(afpMonto)} + ISR ${fmt(isrMonto)}</span></span><span class="amount">-${fmt(totalDeducciones)}</span></div>
    </div>
    <div class="r-row total"><span>Líquido a pagar</span><span class="amount">${fmt(neto)}</span></div>
    <div class="letras">${montoALetras(Math.max(0,neto))}</div>
  `;
  foot.textContent = (cz.vac?'':'La vacación proporcional no se incluye: se reconoce cuando el contrato termina con responsabilidad del patrono o por renuncia; en las demás causales solo se paga la vacación de años ya cumplidos. Confirma este criterio con el Ministerio de Trabajo. ')+(cz.nota||'');

  return {nombre:esc(nombre),dui:'XXXXXXXX-X',cargo:esc(cargo),patrono:esc(patrono),salario,span,vacacion,aguinaldo,vacProp,vacPend,aguiProp,aguiPend,periodosTxt,diasVac,indem,indemLabel,indemNota,
    pagoHED,pagoHEN,pagoAsueto,pagoDescanso,totalRecargos,totalDevengado,
    isssMonto,afpMonto,isrMonto,totalDeducciones,neto,gravable};
}

function buildPrintSheet(d){
  if(!d) return;
  const hoy=new Date().toLocaleDateString('es-SV',{year:'numeric',month:'long',day:'numeric'});
  $('printSheet').innerHTML = `
  <div class="p-page pagebreak">
    <div class="p-head"><h2>Comprobante de Liquidación de Prestaciones Laborales</h2><div>${hoy}</div></div>
    <p><b>Trabajador(a):</b> ${d.nombre} &nbsp; <b>DUI:</b> ${d.dui}<br>
    <b>Cargo:</b> ${d.cargo} &nbsp; <b>Patrono / Empresa:</b> ${d.patrono}<br>
    <b>Salario mensual:</b> ${fmt(d.salario)} &nbsp; <b>Tiempo de servicio:</b> ${d.span.years} año(s), ${d.span.months} mes(es), ${d.span.days} día(s)</p>

    <table class="p-table"><tr><th>Concepto</th><th>Detalle</th><th>Monto</th></tr>
      <tr><td>Vacación proporcional</td><td>15 días + 30% recargo</td><td class="n">${fmt(d.vacProp)}</td></tr>
      ${d.vacPend>0?`<tr><td>Vacación pendiente año anterior</td><td>15 días + 30% recargo</td><td class="n">${fmt(d.vacPend)}</td></tr>`:''}
      ${d.diasVac>0?`<tr><td>Período vacacional</td><td colspan="2">${d.periodosTxt}</td></tr>`:''}
      <tr><td>Aguinaldo proporcional</td><td>Según antigüedad</td><td class="n">${fmt(d.aguiProp)}</td></tr>
      ${d.aguiPend>0?`<tr><td>Aguinaldo pendiente año anterior</td><td>Según antigüedad</td><td class="n">${fmt(d.aguiPend)}</td></tr>`:''}
      <tr><td>${d.indemLabel}</td><td>${d.indemNota}</td><td class="n">${fmt(d.indem)}</td></tr>
      <tr><td>Horas extra diurnas</td><td>Recargo 100%</td><td class="n">${fmt(d.pagoHED)}</td></tr>
      <tr><td>Horas extra nocturnas</td><td>Nocturnidad + 100%</td><td class="n">${fmt(d.pagoHEN)}</td></tr>
      <tr><td>Asueto / descanso trabajado</td><td>Recargo 100% / 50%</td><td class="n">${fmt(d.pagoAsueto+d.pagoDescanso)}</td></tr>
      <tr class="p-total"><td colspan="2">Total devengado (bruto)</td><td class="n">${fmt(d.totalDevengado)}</td></tr>
    </table>

    <table class="p-table"><tr><th>Deducción</th><th>Monto</th></tr>
      <tr><td>ISSS (3%)</td><td class="n">-${fmt(d.isssMonto)}</td></tr>
      <tr><td>AFP (7.25%)</td><td class="n">-${fmt(d.afpMonto)}</td></tr>
      <tr><td>ISR</td><td class="n">-${fmt(d.isrMonto)}</td></tr>
      <tr class="p-total"><td>Total retenciones</td><td class="n">-${fmt(d.totalDeducciones)}</td></tr>
      <tr class="p-total"><td>LÍQUIDO A PAGAR</td><td class="n">${fmt(d.neto)}</td></tr>
    </table>
    <p><i>${montoALetras(Math.max(0,d.neto))}</i></p>
  </div>
  <div class="p-page">
    <div class="p-head"><h2>Declaración de conformidad</h2><div>${hoy}</div></div>
    <p>Yo, <b>${d.nombre}</b>, portador(a) de DUI número <b>${d.dui}</b>, declaro haber recibido de parte de <b>${d.patrono}</b> la cantidad de <b>${fmt(d.neto)}</b> (${montoALetras(Math.max(0,d.neto))}) en concepto de liquidación final de prestaciones laborales correspondientes a mi tiempo de servicio, manifestando mi entera conformidad con los montos y conceptos detallados en la página anterior, sin reserva de acción posterior alguna derivada de dicha relación laboral.</p>

    <div class="p-sign">
      <div>Firma del trabajador(a)<br>${d.nombre}</div>
      <div>Firma y sello del patrono<br>${d.patrono}</div>
    </div>

    <div class="p-legal">
      <b>Advertencia legal (Art. 402 Código de Trabajo):</b> el presente documento, para tener validez como comprobante de terminación y liquidación de la relación laboral, debe formalizarse mediante documento privado autenticado por notario o mediante la hoja de finiquito del Ministerio de Trabajo y Previsión Social, únicos instrumentos reconocidos por la ley para tal efecto. Este comprobante es una herramienta de cálculo de referencia y no reemplaza dicha formalización.
    </div>
  </div>`;
}

// Bloqueos en cascada: datos generales -> salario y fechas -> causal -> jornadas y vacaciones
function updateLocks(){
  const v=id=>$(id).value.trim();
  const datosOk=!!v('nombre')&&!!v('cargo')&&!!v('patrono')&&/^\d{8}-\d$/.test(v('dui'));
  const fechasOk=parseFloat($('salario').value)>0 && !isNaN(parseLocal($('ingreso').value)) && !isNaN(parseLocal($('fin').value));
  const motivoOk=!!$('motivo').value;
  ['salario','sector','ingreso','fin'].forEach(id=>$(id).disabled=!datosOk);
  $('motivo').disabled=!(datosOk&&fechasOk);
  const off3=!(datosOk&&fechasOk&&motivoOk);
  document.querySelectorAll('#p3 input,#p3 select,#p4 input,#p4 select').forEach(el=>el.disabled=off3);
  $('p2').classList.toggle('locked',!datosOk);
  $('p3').classList.toggle('locked',off3);
  $('p4').classList.toggle('locked',off3);
  $('asuetoWrap').style.display=document.querySelector('input[name="asuetoSi"]:checked').value==='si'?'block':'none';
  $('lockHint').textContent = !datosOk ? 'Completa nombre, DUI (00000000-0), cargo y patrono para desbloquear el siguiente apartado.'
    : !fechasOk ? 'Indica el salario y las fechas para poder elegir la causal.'
    : !motivoOk ? 'Selecciona la causal para desbloquear jornadas especiales y vacaciones.' : '';
}

document.addEventListener('input', e => {
  tocado=true;
  if(e.target.id==='dui'){ const v=e.target.value.replace(/\D/g,'').slice(0,9); e.target.value=v.length>8?v.slice(0,8)+'-'+v.slice(8):v; }
  if(e.target.name==='comis') $('comisWrap').style.display = e.target.value==='si' ? 'block' : 'none';
  if(e.target.id==='motivo'){ $('venceWrap').style.display = e.target.value==='plazo_injust' ? 'block' : 'none'; $('avisoWrap').style.display = e.target.value==='renuncia' ? 'block' : 'none'; }
  if(e.target.id==='municipio') $('patronalWrap').style.display = e.target.value==='otro' ? 'block' : 'none';
  if(e.target.classList && e.target.classList.contains('asueto-chk')){ if(e.target.checked) asuetoChecked.add(e.target.id); else asuetoChecked.delete(e.target.id); }
  if(['ingreso','fin','municipio','fechaPatronal'].includes(e.target.id)) refreshAsuetoList();
  updateLocks();
  buildPrintSheet(calcular());
});

$('printBtn').addEventListener('click', ()=>{
  const d=calcular();
  if(!d){ tocado=true; calcular(); $('results').scrollIntoView({behavior:'smooth'}); return; }
  buildPrintSheet(d); window.print();
});

const _t=new Date(); $('fin').value=_t.getFullYear()+'-'+String(_t.getMonth()+1).padStart(2,'0')+'-'+String(_t.getDate()).padStart(2,'0'); // fin = hoy
refreshAsuetoList();
updateLocks();
buildPrintSheet(calcular());
