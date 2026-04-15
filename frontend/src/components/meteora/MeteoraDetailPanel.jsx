import { useState } from 'react';
import { InfoTip } from '../shared/Tooltip';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt$(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(2)}`;
}
function fmtNet(n) { return n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`; }

// ─── Primitives ────────────────────────────────────────────────────────────────

function Card({ children, className = '' }) {
  return (
    <div className={`bg-slate-800/50 rounded-xl border border-slate-700/50 p-3 ${className}`}>
      {children}
    </div>
  );
}

function Section({ icon, title, tooltip, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-3 pb-1.5 border-b border-slate-700/40">
        {icon && <span className="text-sm">{icon}</span>}
        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{title}</span>
        {tooltip && <InfoTip text={tooltip} />}
      </div>
      {children}
    </div>
  );
}

function KV({ label, value, valueClass = 'text-slate-200', tooltip }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-xs text-slate-500 flex items-center">
        {label}
        {tooltip && <InfoTip text={tooltip} position="right" />}
      </span>
      <span className={`text-xs font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function ScoreBar({ value, colorOverride }) {
  const pct   = Math.min(100, Math.max(0, value));
  const color = colorOverride || (pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-500' : pct >= 35 ? 'bg-orange-500' : 'bg-red-500');
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-300 w-8 text-right tabular-nums">{value}</span>
    </div>
  );
}

function VerdictBadge({ verdict, color }) {
  const styles = {
    emerald: 'from-emerald-900/80 to-emerald-800/40 text-emerald-300 border-emerald-600/60',
    green:   'from-green-900/80   to-green-800/40   text-green-300   border-green-600/60',
    yellow:  'from-yellow-900/80  to-yellow-800/40  text-yellow-300  border-yellow-600/60',
    orange:  'from-orange-900/80  to-orange-800/40  text-orange-300  border-orange-600/60',
    red:     'from-red-900/80     to-red-800/40     text-red-300     border-red-600/60',
  }[color] || 'from-slate-800 to-slate-800 text-slate-300 border-slate-600';
  return (
    <span className={`inline-flex items-center px-4 py-1.5 rounded-full border bg-gradient-to-r text-sm font-black tracking-wide ${styles}`}>
      {verdict}
    </span>
  );
}

// ─── Investment Simulator ──────────────────────────────────────────────────────

function InvestmentSimulator({ a }) {
  const [amount, setAmount] = useState(1000);
  const [days,   setDays]   = useState(30);

  const capital      = parseFloat(amount) || 0;
  const d            = parseInt(days)     || 0;
  const dailyFeeRate = a.actualDailyFeeRate / 100;

  const feeIncome = capital * dailyFeeRate * d;
  const fraction  = d / 365;
  const ilOpt     = capital * (a.ilEstimate.optimistic   / 100) * fraction;
  const ilMid     = capital * (a.ilEstimate.moderate     / 100) * fraction;
  const ilCons    = capital * (a.ilEstimate.conservative / 100) * fraction;

  const rows = [
    { label: 'Optimista',   icon: '🟢', fee: feeIncome, il: ilOpt,  profit: feeIncome - ilOpt,  final: capital + feeIncome - ilOpt },
    { label: 'Moderado',    icon: '🟡', fee: feeIncome, il: ilMid,  profit: feeIncome - ilMid,  final: capital + feeIncome - ilMid },
    { label: 'Conservador', icon: '🔴', fee: feeIncome, il: ilCons, profit: feeIncome - ilCons, final: capital + feeIncome - ilCons },
  ];

  return (
    <Section icon="🧮" title="Simulador"
      tooltip="Calculá cuánto ganarías o perderías si invertís en este pool durante un período determinado.">
      {/* Inputs */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="text-[10px] text-slate-500 block mb-1 font-medium">Capital</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
            <input type="number" min="1" value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 focus:border-blue-600 rounded-lg pl-6 pr-2 py-2 text-sm text-white outline-none transition-colors" />
          </div>
        </div>
        <div className="w-24">
          <label className="text-[10px] text-slate-500 block mb-1 font-medium">Días</label>
          <input type="number" min="1" max="365" value={days}
            onChange={e => setDays(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 focus:border-blue-600 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors" />
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl overflow-hidden border border-slate-700/50">
        <div className="grid grid-cols-5 bg-slate-900/60 text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-3 py-2 gap-2">
          <div>Escenario</div>
          <div className="text-right">Comisiones</div>
          <div className="text-right">Pérd. temp.</div>
          <div className="text-right">Ganancia</div>
          <div className="text-right">Total</div>
        </div>
        {rows.map(r => (
          <div key={r.label} className="grid grid-cols-5 px-3 py-2.5 gap-2 border-t border-slate-800 hover:bg-slate-800/30 transition-colors text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <span>{r.icon}</span>{r.label}
            </div>
            <div className="text-right text-blue-300 font-semibold">+{fmt$(r.fee)}</div>
            <div className="text-right text-orange-400">−{fmt$(r.il)}</div>
            <div className={`text-right font-bold ${r.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {r.profit >= 0 ? '+' : ''}{fmt$(r.profit)}
            </div>
            <div className={`text-right font-bold ${r.final >= capital ? 'text-emerald-300' : 'text-red-400'}`}>
              {fmt$(r.final)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 mt-2.5 text-xs text-slate-500">
        <span>Ganancia diaria estimada: <strong className="text-blue-300">{fmt$(capital * dailyFeeRate)}</strong></span>
        <span>Proyección anual: <strong className="text-slate-300">{fmt$(capital * dailyFeeRate * 365)}</strong></span>
        {a.maxRecommendedCapital > 0 && capital > a.maxRecommendedCapital && (
          <span className="text-yellow-400">⚠ Supera el máx recomendado ({fmt$(a.maxRecommendedCapital)})</span>
        )}
      </div>
    </Section>
  );
}

// ─── Reliability ───────────────────────────────────────────────────────────────

function ReliabilitySection({ a }) {
  const levelColor = {
    MUY_ALTA: 'text-emerald-400', ALTA: 'text-green-400',
    MEDIA: 'text-yellow-400', BAJA: 'text-orange-400', MUY_BAJA: 'text-red-400',
  }[a.reliabilityLevel] || 'text-slate-400';

  const factors = [
    { label: 'Liquidez (TVL)',  value: a.reliabilityFactors.tvlScore,      tooltip: 'Cuánto dinero hay en el pool. Más liquidez = más fácil entrar y salir sin mover el precio.' },
    { label: 'Actividad',       value: a.reliabilityFactors.activityScore,  tooltip: 'Relación entre el volumen diario y la liquidez total. Más volumen = más comisiones para los proveedores.' },
    { label: 'Seguridad tokens',value: a.reliabilityFactors.safetyScore,   tooltip: 'Si los tokens del par están verificados, tienen muchos holders y no tienen riesgos de freeze (bloqueo de fondos).' },
    { label: 'Madurez del pool',value: a.reliabilityFactors.maturityScore, tooltip: 'Edad del pool y volumen histórico acumulado. Los pools más antiguos con mucho historial son más predecibles.' },
  ];

  return (
    <Section icon="🛡️" title="Confiabilidad"
      tooltip="Puntaje de 0 a 100 que resume qué tan seguro y estable es el pool. Considera liquidez, actividad, calidad de los tokens y experiencia histórica.">
      <div className="flex items-center gap-4 mb-3">
        <div className={`text-4xl font-black tabular-nums ${levelColor}`}>{a.reliabilityScore}</div>
        <div>
          <div className={`text-sm font-bold ${levelColor}`}>{a.reliabilityLevel.replace(/_/g, ' ')}</div>
          <div className="text-xs text-slate-500">confianza sobre 100</div>
        </div>
      </div>
      <ScoreBar value={a.reliabilityScore} />
      <div className="mt-3 space-y-2">
        {factors.map(f => (
          <div key={f.label}>
            <div className="flex justify-between mb-0.5">
              <span className="text-xs text-slate-500 flex items-center">
                {f.label}<InfoTip text={f.tooltip} position="right" />
              </span>
              <span className="text-xs text-slate-400 font-semibold">{f.value}/100</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${f.value >= 70 ? 'bg-emerald-500' : f.value >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${f.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── Profitability ─────────────────────────────────────────────────────────────

function ProfitabilitySection({ a }) {
  const netColor = n => n > 50 ? 'text-emerald-400' : n > 10 ? 'text-green-400' : n > 0 ? 'text-yellow-400' : 'text-red-400';
  const fmtDays  = n => n == null ? 'No rentable' : n > 365 ? '+1 año' : `${n} días`;

  return (
    <Section icon="📈" title="Rentabilidad"
      tooltip="Análisis de cuánto podés ganar (comisiones) versus cuánto podés perder (pérdida impermanente) según diferentes escenarios de movimiento del precio.">

      {/* Scenario table */}
      <div className="rounded-xl overflow-hidden border border-slate-700/50 mb-3">
        <div className="grid grid-cols-4 bg-slate-900/60 text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-3 py-2">
          <div>Escenario</div>
          <div className="text-right flex items-center justify-end gap-1">
            Pérd. imp.<InfoTip text="Pérdida Impermanente estimada por año. Si los precios cambian mucho, podés terminar con menos que si hubieras guardado los tokens sin invertir." position="top" />
          </div>
          <div className="text-right flex items-center justify-end gap-1">
            Fees<InfoTip text="Comisiones anualizadas reales basadas en el volumen de las últimas 24h." position="top" />
          </div>
          <div className="text-right flex items-center justify-end gap-1">
            Neto<InfoTip text="Ganancia o pérdida real = Comisiones − Pérdida impermanente." position="top" />
          </div>
        </div>
        {[
          { label: 'Optimista',   icon: '🟢', il: a.ilEstimate.optimistic,   net: a.netReturnEstimate.optimistic },
          { label: 'Moderado',    icon: '🟡', il: a.ilEstimate.moderate,     net: a.netReturnEstimate.moderate },
          { label: 'Conservador', icon: '🔴', il: a.ilEstimate.conservative, net: a.netReturnEstimate.conservative },
        ].map(r => (
          <div key={r.label} className="grid grid-cols-4 px-3 py-2.5 border-t border-slate-800 text-xs hover:bg-slate-800/30 transition-colors">
            <div className="flex items-center gap-1.5 text-slate-400">{r.icon} {r.label}</div>
            <div className="text-right text-orange-400">{r.il.toFixed(1)}%</div>
            <div className="text-right text-blue-400">{a.actualAnnualFeeRate.toFixed(1)}%</div>
            <div className={`text-right font-bold ${netColor(r.net)}`}>{fmtNet(r.net)}</div>
          </div>
        ))}
      </div>

      {/* Days to profit */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide flex items-center">
          Días para recuperar (escenario moderado)
          <InfoTip text="Cuántos días necesitás mantener la posición para ganar ese porcentaje sobre tu capital inicial, descontando la pérdida impermanente estimada." />
        </p>
        {[['1%', a.profitabilityDays.for1Pct], ['5%', a.profitabilityDays.for5Pct], ['10%', a.profitabilityDays.for10Pct], ['20%', a.profitabilityDays.for20Pct], ['50%', a.profitabilityDays.for50Pct]].map(([t, d]) => (
          <div key={t} className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Ganar {t}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d == null ? 'bg-red-900/40 text-red-400' : 'bg-slate-800 text-slate-200'}`}>{fmtDays(d)}</span>
          </div>
        ))}
      </div>

      {/* Volume trend */}
      <div className="mt-3 flex items-center justify-between p-2 bg-slate-800/40 rounded-lg">
        <span className="text-xs text-slate-500 flex items-center">
          Tendencia de volumen
          <InfoTip text="Si el volumen de operaciones está subiendo o bajando en las últimas horas. Más volumen = más comisiones para vos." />
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          a.volumeTrend === 'ACELERANDO'     ? 'bg-emerald-900/50 text-emerald-300' :
          a.volumeTrend === 'ESTABLE_ARRIBA' ? 'bg-green-900/50 text-green-300'    :
          a.volumeTrend === 'DESACELERANDO'  ? 'bg-red-900/50 text-red-300'        :
          a.volumeTrend === 'ESTABLE_ABAJO'  ? 'bg-orange-900/50 text-orange-300'  : 'bg-slate-700 text-slate-400'
        }`}>{a.volumeTrend}</span>
      </div>
    </Section>
  );
}

// ─── Capital ───────────────────────────────────────────────────────────────────

function CapitalSection({ a }) {
  return (
    <Section icon="💵" title="Capital necesario"
      tooltip="Cuánto dinero necesitás invertir para generar un ingreso diario determinado en este pool, basado en las comisiones reales de las últimas 24h.">
      <div className="space-y-1 mb-3">
        {[
          ['$1 por día',   a.minCapital.for1UsdDay],
          ['$5 por día',   a.minCapital.for5UsdDay],
          ['$10 por día',  a.minCapital.for10UsdDay],
          ['$50 por día',  a.minCapital.for50UsdDay],
          ['$100 por día', a.minCapital.for100UsdDay],
        ].map(([label, cap]) => (
          <div key={label} className="flex justify-between items-center py-0.5">
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-xs font-semibold text-slate-200 tabular-nums">{cap == null ? 'No calculable' : fmt$(cap)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center p-2 bg-yellow-900/20 border border-yellow-800/40 rounded-lg">
        <span className="text-xs text-slate-400 flex items-center">
          Máximo recomendado
          <InfoTip text="Se recomienda no superar el 10% del TVL total del pool para no impactar los precios con tus propias operaciones." position="right" />
        </span>
        <span className="text-xs font-bold text-yellow-400">{fmt$(a.maxRecommendedCapital)}</span>
      </div>
    </Section>
  );
}

// ─── Fee vs APY ────────────────────────────────────────────────────────────────

function FeeVsApySection({ a }) {
  if (!a.feeBasedApy && !a.reportedApy) return null;
  return (
    <Section icon="🔍" title="APY publicado vs real"
      tooltip="Compara el APY que muestra Meteora con el calculado a partir de las comisiones reales de las últimas 24h. Si hay mucha diferencia, el APY publicado puede no ser sostenible.">
      <div className="space-y-1.5">
        <KV label="APY que muestra Meteora" value={`${a.reportedApy?.toFixed(1)}%`}
          tooltip="El rendimiento anual que la plataforma publica. Puede estar basado en periodos de alta actividad." />
        <KV label="APY real (fees 24h)" value={`${a.feeBasedApy?.toFixed(1)}%`} valueClass="text-blue-300"
          tooltip="Calculado dividiendo las comisiones de hoy por el TVL y anualizando. Es el dato más confiable." />
        <KV label="Diferencia" value={`${a.apyDiscrepancy > 0 ? '+' : ''}${a.apyDiscrepancy?.toFixed(1)}%`}
          valueClass={a.apyIsInflated ? 'text-orange-400' : 'text-slate-300'}
          tooltip="Cuánto más alto es el APY publicado respecto al real. Si supera el 30%, hay que tener cuidado." />
        <KV label="Volatilidad implícita" value={`~${a.impliedAnnualVol}%`}
          tooltip="Estimación de qué tan brusco es el movimiento del precio del par, basada en la comisión base del pool." />
      </div>
      {a.apyIsInflated && (
        <div className="mt-2 flex items-start gap-2 p-2 bg-orange-900/20 border border-orange-800/40 rounded-lg">
          <span className="text-orange-400 mt-0.5 flex-shrink-0">⚠</span>
          <span className="text-xs text-orange-300 leading-relaxed">El APY publicado es significativamente mayor que las comisiones reales generadas hoy. Puede no ser sostenible.</span>
        </div>
      )}
    </Section>
  );
}

// ─── Break-even & range probability ────────────────────────────────────────────

function BreakEvenSection({ a, pool }) {
  const { breakEvenPriceDown, breakEvenPriceUp, rangeExitProb } = a;
  if (!breakEvenPriceDown && !breakEvenPriceUp && !rangeExitProb) return null;

  const fmtP = p => p != null ? `$${p.toLocaleString('en-US', { maximumFractionDigits: p < 1 ? 6 : 2 })}` : '—';

  return (
    <Section icon="⚖️" title="Break-even y riesgo de rango"
      tooltip="Muestra hasta dónde puede moverse el precio antes de que empieces a perder, y qué tan probable es que el precio salga de tu rango de liquidez.">

      {/* Break-even */}
      {(breakEvenPriceDown || breakEvenPriceUp) && (
        <Card className="mb-3">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-2 flex items-center">
            Precio límite a 30 días
            <InfoTip text="Si el precio llega a estos niveles en 30 días, las comisiones ganadas ya no compensan la pérdida impermanente acumulada." />
          </p>
          <div className="space-y-1.5">
            {breakEvenPriceDown && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">↓ Si el precio cae</span>
                <span className="text-red-300 font-bold text-sm">{fmtP(breakEvenPriceDown)}</span>
              </div>
            )}
            {breakEvenPriceUp && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">↑ Si el precio sube</span>
                <span className="text-orange-300 font-bold text-sm">{fmtP(breakEvenPriceUp)}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Range exit probability */}
      {rangeExitProb && (
        <div>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-2 flex items-center">
            Prob. de salir del rango
            <InfoTip text="Qué tan probable es que el precio salga de tu rango elegido. Si sale, dejás de ganar comisiones hasta que reposicionés. Menos % = más seguro." />
          </p>
          <div className="space-y-2">
            {[
              ['Estrecho — 7 días',  rangeExitProb.tight7d],
              ['Estrecho — 14 días', rangeExitProb.tight14d],
              ['Moderado — 7 días',  rangeExitProb.moderate7d],
              ['Moderado — 14 días', rangeExitProb.moderate14d],
              ['Amplio — 7 días',    rangeExitProb.wide7d],
            ].map(([label, prob]) => prob != null ? (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 w-36 flex-shrink-0">{label}</span>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${prob > 70 ? 'bg-red-500' : prob > 40 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                    style={{ width: `${prob}%` }} />
                </div>
                <span className={`text-xs font-bold w-9 text-right tabular-nums ${prob > 70 ? 'text-red-400' : prob > 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {prob}%
                </span>
              </div>
            ) : null)}
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Range recommendations ─────────────────────────────────────────────────────

function RangeSection({ a, pool }) {
  const { rangeRecommendation: ranges, managementFrequency } = a;
  const hasPrice = pool.currentPrice > 0;

  return (
    <Section icon="📏" title="Rangos de precio"
      tooltip="Define los límites de precio dentro de los cuales tu liquidez estará activa y generando comisiones. Rango más estrecho = más comisiones, pero más gestión.">
      <div className="space-y-2 mb-3">
        {[
          { key: 'tight',    label: 'Estrecho',  color: 'text-yellow-300',  bg: 'bg-yellow-900/20 border-yellow-800/30',  desc: 'Más fees · más gestión requerida' },
          { key: 'moderate', label: 'Moderado',  color: 'text-emerald-300', bg: 'bg-emerald-900/20 border-emerald-800/30', desc: 'Balance ideal para la mayoría' },
          { key: 'wide',     label: 'Amplio',    color: 'text-blue-300',    bg: 'bg-blue-900/20 border-blue-800/30',       desc: 'Menor gestión · menos fees' },
        ].map(({ key, label, color, bg, desc }) => {
          const r = ranges[key];
          if (!r) return null;
          return (
            <div key={key} className={`rounded-lg border p-2.5 ${bg}`}>
              <div className="flex items-baseline justify-between mb-0.5">
                <span className={`text-xs font-bold ${color}`}>{label}</span>
                <span className="text-[11px] text-slate-400">{r.bins} bins · ±{r.pct}%</span>
              </div>
              {hasPrice && r.priceMin != null && (
                <div className="text-xs font-mono text-slate-300 my-1">
                  {r.priceMin.toFixed(6)} → {r.priceMax.toFixed(6)}
                </div>
              )}
              <div className="text-[11px] text-slate-500">{desc}</div>
            </div>
          );
        })}
      </div>
      <KV label="Frecuencia de reposicionado" value={managementFrequency}
        tooltip="Con qué frecuencia tenés que revisar y ajustar tu rango de liquidez para seguir siendo eficiente." />
    </Section>
  );
}

// ─── Pool details ──────────────────────────────────────────────────────────────

function PoolDetailsSection({ a, pool }) {
  return (
    <Section icon="ℹ️" title="Datos del pool">
      <div className="space-y-1 mb-3">
        <KV label="Categoría" value={a.pairCategory.replace(/_/g, ' – ')}
          tooltip="Tipo de par de activos. Estable-Estable tiene menor riesgo. Alt-Alt tiene más volatilidad y pérdida impermanente potencial." />
        <KV label="Bin step" value={pool.binStep || '—'}
          tooltip="Tamaño de cada 'escalón' de precio. Más pequeño = más granularidad y precisión en el rango." />
        <KV label="Fee base" value={pool.baseFee > 0 ? `${pool.baseFee}%` : '—'}
          tooltip="Comisión fija que cobra el pool por cada swap. Parte de eso va para vos como proveedor de liquidez." />
        <KV label="TVL actual" value={fmt$(pool.tvl)} />
        <KV label="Volumen 24h" value={pool.vol24h > 0 ? fmt$(pool.vol24h) : '—'}
          tooltip="Total operado en el pool en las últimas 24 horas." />
        <KV label="Fees 24h" value={pool.fees24h > 0 ? fmt$(pool.fees24h) : '—'}
          tooltip="Comisiones generadas hoy. Se reparten entre todos los proveedores de liquidez según su participación." />
        <KV label="APY real (fees)" value={`${a.actualAnnualFeeRate.toFixed(1)}%`} valueClass="text-blue-300"
          tooltip="Rendimiento anual calculado a partir de las comisiones reales de hoy. El dato más confiable." />
        {a.poolAgeDays > 0 && <KV label="Antigüedad" value={`${a.poolAgeDays} días`} />}
        {a.cumulativeVolume > 0 && <KV label="Vol. histórico total" value={`$${a.cumulativeVolume.toFixed(1)}M`} />}
        {a.hasFarm && <KV label="Farm APR extra" value={`+${a.farmApr.toFixed(1)}%`} valueClass="text-emerald-400"
          tooltip="Recompensas adicionales en tokens por participar en el programa de farming del pool." />}
        {pool.tvlChange != null && pool.tvlChange !== 0 && (
          <KV label="Cambio de TVL" value={`${pool.tvlChange > 0 ? '+' : ''}${pool.tvlChange}%`}
            valueClass={pool.tvlChange > 0 ? 'text-emerald-400' : 'text-red-400'}
            tooltip="Variación del TVL desde la última actualización. Caída significa que otros están retirando liquidez." />
        )}
      </div>

      {/* Token safety */}
      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-2 flex items-center">
        Seguridad de los tokens
        <InfoTip text="Información sobre los tokens del par. Verificado = listado oficial. Freeze off = nadie puede bloquear tus tokens. Más holders = más descentralizado." />
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[pool.tokenX, pool.tokenY].filter(Boolean).map(t => (
          <div key={t.symbol} className="bg-slate-900/60 rounded-lg border border-slate-700/50 p-2.5">
            <div className="text-sm font-bold text-slate-100 mb-2">{t.symbol}</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.isVerified ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-xs text-slate-400">{t.isVerified ? 'Verificado' : 'Sin verificar'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.freezeAuthorityDisabled ? 'bg-emerald-400' : 'bg-orange-400'}`} />
                <span className="text-xs text-slate-400">{t.freezeAuthorityDisabled ? 'Freeze deshabilitada' : '⚠ Freeze activa'}</span>
              </div>
              {t.holders > 0 && (
                <div className="text-xs text-slate-500">{t.holders >= 1000 ? `${(t.holders / 1000).toFixed(0)}K` : t.holders} holders</div>
              )}
              {t.price > 0 && (
                <div className="text-xs font-mono text-slate-300">${t.price < 1 ? t.price.toFixed(6) : t.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── Risk & Strengths ──────────────────────────────────────────────────────────

function RiskStrengthsSection({ a }) {
  if (a.strengths.length === 0 && a.riskFactors.length === 0) return null;
  return (
    <Section icon="⚡" title="Fortalezas y riesgos"
      tooltip="Lista de los puntos fuertes y débiles más importantes de este pool basados en el análisis automático.">
      {a.strengths.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wide mb-1.5">Fortalezas</p>
          <div className="space-y-1.5">
            {a.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 p-1.5 bg-emerald-900/15 rounded-lg">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span className="text-xs text-slate-300 leading-relaxed">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {a.riskFactors.length > 0 && (
        <div>
          <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wide mb-1.5">Riesgos</p>
          <div className="space-y-1.5">
            {a.riskFactors.map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-1.5 bg-red-900/15 rounded-lg">
                <span className="text-orange-400 flex-shrink-0">⚠</span>
                <span className="text-xs text-slate-400 leading-relaxed">{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export default function MeteoraDetailPanel({ pool }) {
  const a = pool.analysis;

  if (!a) {
    return (
      <div className="px-6 py-4 text-xs text-slate-500 bg-slate-900/80">
        Análisis no disponible para este pool.
      </div>
    );
  }

  const verdictIcon = { EXCELENTE: '★', BUENA: '✓', ACEPTABLE: '~', PRECAUCIÓN: '!', EVITAR: '✗' }[a.verdict] || '?';

  return (
    <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-t border-slate-700/50 px-6 py-6">

      {/* ── Header hero ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-slate-700/40">
        <VerdictBadge verdict={`${verdictIcon} ${a.verdict}`} color={a.verdictColor} />

        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-full border border-slate-700">
            <span className="text-slate-500">Par</span>
            <strong className="text-slate-200">{a.pairCategory.replace(/_/g, ' – ')}</strong>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-900/30 rounded-full border border-blue-800/40">
            <span className="text-slate-500">Fees reales/año</span>
            <strong className="text-blue-300">{a.actualAnnualFeeRate.toFixed(1)}%</strong>
          </span>
          {a.isViable
            ? <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-900/30 rounded-full border border-emerald-800/40 text-emerald-400 font-semibold">✓ Rentable en escenario moderado</span>
            : <span className="flex items-center gap-1 px-2.5 py-1 bg-red-900/30 rounded-full border border-red-800/40 text-red-400 font-semibold">✗ No rentable en escenario moderado</span>
          }
        </div>
      </div>

      {/* ── 3-column grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-2">
        <div>
          <InvestmentSimulator a={a} pool={pool} />
          <ReliabilitySection a={a} />
          <RiskStrengthsSection a={a} />
        </div>
        <div>
          <ProfitabilitySection a={a} />
          <CapitalSection a={a} />
          <FeeVsApySection a={a} />
        </div>
        <div>
          <BreakEvenSection a={a} pool={pool} />
          <RangeSection a={a} pool={pool} />
          <PoolDetailsSection a={a} pool={pool} />
        </div>
      </div>
    </div>
  );
}
