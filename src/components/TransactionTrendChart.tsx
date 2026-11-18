import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatRupiah } from '../services/cashlessApi';
import { Transaksi } from '../types';

interface TransactionTrendChartProps {
  transaksiList: Transaksi[];
}

interface DailyPoint {
  dateKey: string;
  label: string;
  topUp: number;
  belanja: number;
  tarikTunai: number;
}

const formatCompactRupiah = (value: number): string => {
  if (value === 0) return '0';
  if (value >= 1_000_000) {
    const jt = value / 1_000_000;
    return `${Number.isInteger(jt) ? jt : jt.toFixed(1)}jt`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}rb`;
  }
  return String(value);
};

export const TransactionTrendChart: React.FC<TransactionTrendChartProps> = ({
  transaksiList,
}) => {
  const chartData = useMemo<DailyPoint[]>(() => {
    const days: DailyPoint[] = [];
    const indexByDate = new Map<string, DailyPoint>();
    const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - offset);
      const dateKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const label = d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
      });
      const point: DailyPoint = {
        dateKey,
        label,
        topUp: 0,
        belanja: 0,
        tarikTunai: 0,
      };
      days.push(point);
      indexByDate.set(dateKey, point);
    }

    for (const trx of transaksiList) {
      const dateKey = String(trx.tanggal_waktu || '').slice(0, 10);
      const bucket = indexByDate.get(dateKey);
      if (!bucket) continue;
      const nom = Number(trx.nominal || 0);
      if (trx.jenis_transaksi === 'Top Up') bucket.topUp += nom;
      else if (trx.jenis_transaksi === 'Belanja') bucket.belanja += nom;
      else if (trx.jenis_transaksi === 'Tarik Tunai') bucket.tarikTunai += nom;
    }

    return days;
  }, [transaksiList]);

  const hasAnyData = chartData.some(
    (d) => d.topUp > 0 || d.belanja > 0 || d.tarikTunai > 0
  );

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Grafik Perbandingan Transaksi (7 Hari Terakhir)
          </h3>
          <p className="text-xs text-slate-500">
            Perbandingan total nominal Top Up, Belanja, dan Tarik Tunai per hari
          </p>
        </div>
        {!hasAnyData && (
          <span className="text-xs text-slate-500">
            Belum ada transaksi dalam 7 hari terakhir
          </span>
        )}
      </div>

      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatCompactRupiah}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              cursor={{ fill: 'rgba(241, 245, 249, 0.7)' }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                return (
                  <div className="bg-slate-900 text-white px-3 py-2.5 rounded-lg shadow-lg border border-slate-700 text-xs space-y-1">
                    <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1">
                      {label}
                    </div>
                    {payload.map((entry) => (
                      <div
                        key={String(entry.dataKey)}
                        className="flex items-center justify-between gap-4"
                      >
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-xs"
                            style={{ backgroundColor: entry.color }}
                          />
                          {entry.name}
                        </span>
                        <strong className="font-mono tabular-nums text-white">
                          {formatRupiah(Number(entry.value || 0))}
                        </strong>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              iconType="square"
            />
            <Bar
              dataKey="topUp"
              name="Top Up"
              fill="#16a34a"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="belanja"
              name="Belanja"
              fill="#dc2626"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="tarikTunai"
              name="Tarik Tunai"
              fill="#d97706"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
