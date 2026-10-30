"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  GraduationCap,
  TrendingUp,
  Trophy,
  Users,
  Sun,
  Sunset,
  Moon,
  Layers,
  Loader2,
  AlertCircle,
  RefreshCw,
  BarChart3,
  ScatterChart as ScatterIcon,
} from "lucide-react";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQpRoiWeSHgJtucpv9HckYHpINBK8ZSET4KL9zZjupzgjT1XhD1Yz1Jb0il0xAkKA/pub?output=csv";

type TurnoOption = "Todos" | "Manhã" | "Tarde" | "Noite";
type TurnoValido = "Manhã" | "Tarde" | "Noite";
type SubjectKey = "programacao" | "bancoDados" | "ia";

interface StudentRecord {
  id: string;
  turno: TurnoValido;
  programacao: number;
  bancoDados: number;
  ia: number;
  mediaGeral: number;
}

interface ShiftStat {
  turno: TurnoValido;
  mediaGeral: number;
  totalAlunos: number;
}

const TURNOS_FILTRO: TurnoOption[] = ["Todos", "Manhã", "Tarde", "Noite"];
const TURNOS_FIXOS: TurnoValido[] = ["Manhã", "Tarde", "Noite"];

const SUBJECT_OPTIONS: Array<{ key: SubjectKey; label: string }> = [
  { key: "programacao", label: "Programação" },
  { key: "bancoDados", label: "Banco de Dados" },
  { key: "ia", label: "Inteligência Artificial" },
];

const SUBJECT_LABELS: Record<SubjectKey, string> = {
  programacao: "Programação",
  bancoDados: "Banco de Dados",
  ia: "Inteligência Artificial",
};

const SHIFT_COLORS: Record<TurnoValido, string> = {
  Manhã: "#f59e0b", // Amber 500
  Tarde: "#0ea5e9", // Sky 500
  Noite: "#6366f1", // Indigo 500
};

function parseDecimalPtBr(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  const normalized = value.trim().replace(",", ".");
  return normalized ? Number.parseFloat(normalized) : Number.NaN;
}

function normalizeTextKey(key: string): string {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeTurno(raw: unknown): TurnoValido | null {
  if (typeof raw !== "string") return null;
  const clean = normalizeTextKey(raw);
  if (clean.startsWith("manh")) return "Manhã";
  if (clean === "tarde") return "Tarde";
  if (clean === "noite") return "Noite";
  return null;
}

function formatNumberPtBr(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "0,00";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function calculatePearsonCorrelation(
  items: StudentRecord[],
  xKey: SubjectKey,
  yKey: SubjectKey
): number | null {
  const n = items.length;
  if (n < 2) return null;

  const meanX = items.reduce((acc, s) => acc + s[xKey], 0) / n;
  const meanY = items.reduce((acc, s) => acc + s[yKey], 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (const s of items) {
    const dx = s[xKey] - meanX;
    const dy = s[yKey] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? null : num / den;
}

function CustomBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ShiftStat }>;
}) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur-sm">
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: SHIFT_COLORS[data.turno] }}
        />
        <p className="text-sm font-semibold text-slate-800">
          Turno da {data.turno}
        </p>
      </div>
      <div className="space-y-1 text-xs text-slate-600">
        <p className="flex justify-between gap-4">
          <span>Média Geral:</span>
          <span className="font-bold text-slate-900">
            {formatNumberPtBr(data.mediaGeral, 2)}
          </span>
        </p>
        <p className="flex justify-between gap-4">
          <span>Alunos no turno:</span>
          <span className="font-semibold text-slate-800">
            {data.totalAlunos}
          </span>
        </p>
      </div>
    </div>
  );
}

function CustomScatterTooltip({
  active,
  payload,
  xKey,
  yKey,
}: {
  active?: boolean;
  payload?: Array<{ payload: StudentRecord }>;
  xKey: SubjectKey;
  yKey: SubjectKey;
}) {
  if (!active || !payload || !payload.length) return null;
  const student = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between gap-4 border-b border-slate-100 pb-1.5">
        <span className="text-xs font-bold text-slate-900">
          Aluno {student.id}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
          style={{ backgroundColor: SHIFT_COLORS[student.turno] }}
        >
          {student.turno}
        </span>
      </div>
      <div className="space-y-1 text-xs text-slate-600">
        <p className="flex justify-between gap-5">
          <span>Eixo X ({SUBJECT_LABELS[xKey]}):</span>
          <span className="font-bold text-slate-900">
            {formatNumberPtBr(student[xKey], 1)}
          </span>
        </p>
        <p className="flex justify-between gap-5">
          <span>Eixo Y ({SUBJECT_LABELS[yKey]}):</span>
          <span className="font-bold text-slate-900">
            {formatNumberPtBr(student[yKey], 1)}
          </span>
        </p>
        <p className="flex justify-between gap-5 border-t border-slate-100 pt-1 text-slate-500">
          <span>Média Geral:</span>
          <span className="font-semibold text-slate-800">
            {formatNumberPtBr(student.mediaGeral, 1)}
          </span>
        </p>
      </div>
    </div>
  );
}

export default function StudentPerformanceDashboard() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedTurno, setSelectedTurno] = useState<TurnoOption>("Todos");
  const [xAxisSubject, setXAxisSubject] = useState<SubjectKey>("programacao");
  const [yAxisSubject, setYAxisSubject] = useState<SubjectKey>("ia");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSheetData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(CSV_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Falha ao buscar planilha (HTTP ${response.status}).`);
      }

      const csvText = await response.text();

      Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedRows: StudentRecord[] = [];

          results.data.forEach((row, index) => {
            // Map keys resiliently to support exact headers and accent variations
            const normalizedRow: Record<string, string> = {};
            for (const [k, v] of Object.entries(row)) {
              normalizedRow[normalizeTextKey(k)] = v;
            }

            const turno = normalizeTurno(
              row["Turno"] ?? normalizedRow["turno"]
            );
            if (!turno) return;

            const programacao = parseDecimalPtBr(
              row["Programação"] ?? normalizedRow["programacao"]
            );
            const bancoDados = parseDecimalPtBr(
              row["Banco de Dados"] ?? normalizedRow["banco de dados"]
            );
            const ia = parseDecimalPtBr(
              row["Inteligência Artificial"] ??
                normalizedRow["inteligencia artificial"]
            );
            let mediaGeral = parseDecimalPtBr(
              row["Média Geral"] ?? normalizedRow["media geral"]
            );

            // Fallback average if Média Geral cell is absent
            if (!Number.isFinite(mediaGeral)) {
              const validGrades = [programacao, bancoDados, ia].filter((n) =>
                Number.isFinite(n)
              );
              if (validGrades.length > 0) {
                mediaGeral =
                  validGrades.reduce((sum, n) => sum + n, 0) /
                  validGrades.length;
              }
            }

            if (
              !Number.isFinite(programacao) ||
              !Number.isFinite(bancoDados) ||
              !Number.isFinite(ia) ||
              !Number.isFinite(mediaGeral)
            ) {
              return;
            }

            const id =
              (row["ID_Aluno"] ?? normalizedRow["id_aluno"] ?? "").trim() ||
              `ALUNO-${index + 1}`;

            parsedRows.push({
              id,
              turno,
              programacao,
              bancoDados,
              ia,
              mediaGeral,
            });
          });

          setStudents(parsedRows);
          setLoading(false);
        },
        error: (parseError: Error) => {
          setError(
            parseError.message || "Erro ao processar o arquivo CSV da planilha."
          );
          setLoading(false);
        },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os dados da planilha."
      );
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSheetData();
  }, [fetchSheetData]);

  // Dados filtrados pelo Turno selecionado (alimenta os KPIs e o Gráfico de Dispersão)
  const filteredStudents = useMemo(() => {
    if (selectedTurno === "Todos") return students;
    return students.filter((student) => student.turno === selectedTurno);
  }, [students, selectedTurno]);

  // KPIs calculados estritamente sobre os dados filtrados
  const kpis = useMemo(() => {
    const totalAlunos = filteredStudents.length;
    if (totalAlunos === 0) {
      return {
        mediaGeral: 0,
        maiorMedia: 0,
        melhorAlunoId: "-",
        totalAlunos: 0,
      };
    }

    let somaMedias = 0;
    let maiorMedia = -Infinity;
    let melhorAlunoId = filteredStudents[0].id;

    for (const student of filteredStudents) {
      somaMedias += student.mediaGeral;
      if (student.mediaGeral > maiorMedia) {
        maiorMedia = student.mediaGeral;
        melhorAlunoId = student.id;
      }
    }

    return {
      mediaGeral: somaMedias / totalAlunos,
      maiorMedia,
      melhorAlunoId,
      totalAlunos,
    };
  }, [filteredStudents]);

  // Dados agrupados por Turno usando TODOS os dados gerais (fixo para comparação contínua)
  const shiftComparisonData = useMemo<ShiftStat[]>(() => {
    return TURNOS_FIXOS.map((turno) => {
      const group = students.filter((s) => s.turno === turno);
      const total = group.length;
      const media =
        total > 0
          ? group.reduce((acc, s) => acc + s.mediaGeral, 0) / total
          : 0;

      return {
        turno,
        mediaGeral: Number(media.toFixed(2)),
        totalAlunos: total,
      };
    });
  }, [students]);

  // Correlação de Pearson dinâmica entre as duas disciplinas selecionadas no conjunto filtrado
  const correlationR = useMemo(
    () =>
      calculatePearsonCorrelation(
        filteredStudents,
        xAxisSubject,
        yAxisSubject
      ),
    [filteredStudents, xAxisSubject, yAxisSubject]
  );

  const renderTurnoIcon = (turno: TurnoOption) => {
    switch (turno) {
      case "Manhã":
        return <Sun className="h-4 w-4" />;
      case "Tarde":
        return <Sunset className="h-4 w-4" />;
      case "Noite":
        return <Moon className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/80">
      {/* Cabeçalho e Filtro Interativo */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Desempenho Acadêmico dos Alunos
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                Monitoramento em tempo real via Google Sheets • Programação,
                Banco de Dados e IA
              </p>
            </div>
          </div>

          {/* Menu de Botões de Filtro por Turno */}
          <nav
            aria-label="Filtro por turno"
            className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1.5"
          >
            {TURNOS_FILTRO.map((turno) => {
              const isActive = selectedTurno === turno;
              return (
                <button
                  key={turno}
                  type="button"
                  onClick={() => setSelectedTurno(turno)}
                  aria-pressed={isActive}
                  disabled={loading}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/80"
                      : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                  }`}
                >
                  {renderTurnoIcon(turno)}
                  <span>{turno}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Estado de Carregamento */}
        {loading ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <p className="text-lg font-semibold text-slate-800">
              Carregando dados da planilha...
            </p>
            <p className="mt-1.5 max-w-md text-sm text-slate-500">
              Buscando e processando registros atualizados diretamente do Google
              Sheets.
            </p>
          </div>
        ) : error ? (
          /* Estado de Erro */
          <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Erro ao carregar os dados
            </h2>
            <p className="mt-1 max-w-md text-sm text-slate-600">{error}</p>
            <button
              type="button"
              onClick={fetchSheetData}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Barra de contexto do filtro ativo */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Exibindo indicadores para:</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                  {selectedTurno === "Todos"
                    ? "Todos os Turnos"
                    : `Turno da ${selectedTurno}`}
                </span>
              </div>

              <button
                type="button"
                onClick={fetchSheetData}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Atualizar planilha
              </button>
            </div>

            {/* Cards de KPI (Reativos ao filtro ativo) */}
            <section
              aria-label="Indicadores Principais"
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {/* Card 1: Média Geral */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Média Geral
                    </p>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                      {formatNumberPtBr(kpis.mediaGeral, 2)}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Média das notas no recorte:{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedTurno}
                  </span>
                </p>
              </div>

              {/* Card 2: Maior Média */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Maior Média
                    </p>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                      {formatNumberPtBr(kpis.maiorMedia, 2)}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Trophy className="h-6 w-6" />
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Destaque no filtro atual:{" "}
                  <span className="font-semibold text-slate-700">
                    Aluno {kpis.melhorAlunoId}
                  </span>
                </p>
              </div>

              {/* Card 3: Total de Alunos Analisados */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md sm:col-span-2 lg:col-span-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Total de Alunos Analisados
                    </p>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                      {kpis.totalAlunos}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  {students.length > 0
                    ? `${formatNumberPtBr(
                        (kpis.totalAlunos / students.length) * 100,
                        1
                      )}% do total de ${students.length} alunos`
                    : "Nenhum registro carregado"}
                </p>
              </div>
            </section>

            {/* Seção de Gráficos */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Gráfico 1: Análise de Turno (Gráfico de Barras Fixo com todos os turnos) */}
              <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-5">
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-indigo-600" />
                      <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                        Média Geral por Turno
                      </h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                      Comparativo fixo entre Manhã, Tarde e Noite (visão global)
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    Todos os turnos
                  </span>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={shiftComparisonData}
                      margin={{ top: 24, right: 16, left: -12, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="turno"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#475569", fontSize: 13, fontWeight: 600 }}
                      />
                      <YAxis
                        domain={[0, 10]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickFormatter={(val: number) =>
                          val.toLocaleString("pt-BR")
                        }
                      />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        content={<CustomBarTooltip />}
                      />
                      <Bar
                        dataKey="mediaGeral"
                        radius={[10, 10, 0, 0]}
                        maxBarSize={68}
                      >
                        <LabelList
                          dataKey="mediaGeral"
                          position="top"
                          formatter={(val: number) => formatNumberPtBr(val, 2)}
                          style={{
                            fill: "#1e293b",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        />
                        {shiftComparisonData.map((entry) => {
                          const isHighlighted =
                            selectedTurno === "Todos" ||
                            selectedTurno === entry.turno;
                          return (
                            <Cell
                              key={entry.turno}
                              fill={SHIFT_COLORS[entry.turno]}
                              fillOpacity={isHighlighted ? 1 : 0.35}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  {TURNOS_FIXOS.map((turno) => (
                    <div key={turno} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: SHIFT_COLORS[turno] }}
                      />
                      <span className="font-medium text-slate-700">
                        {turno}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráfico 2: Análise de Correlação (Gráfico de Dispersão Reativo) */}
              <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ScatterIcon className="h-5 w-5 text-indigo-600" />
                      <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                        Correlação: {SUBJECT_LABELS[xAxisSubject]} ×{" "}
                        {SUBJECT_LABELS[yAxisSubject]}
                      </h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                      Cada ponto representa um aluno do filtro selecionado (
                      <span className="font-semibold text-slate-700">
                        {selectedTurno}
                      </span>
                      )
                    </p>
                  </div>

                  {correlationR !== null && (
                    <div className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/15">
                      Correlação (r): {formatNumberPtBr(correlationR, 2)}
                    </div>
                  )}
                </div>

                {/* Seletores (Dropdowns) de Disciplinas para Eixo X e Eixo Y */}
                <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="scatter-x-axis"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Eixo X
                    </label>
                    <select
                      id="scatter-x-axis"
                      value={xAxisSubject}
                      onChange={(e) =>
                        setXAxisSubject(e.target.value as SubjectKey)
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {SUBJECT_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="scatter-y-axis"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Eixo Y
                    </label>
                    <select
                      id="scatter-y-axis"
                      value={yAxisSubject}
                      onChange={(e) =>
                        setYAxisSubject(e.target.value as SubjectKey)
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {SUBJECT_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 16, right: 20, bottom: 24, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        dataKey={xAxisSubject}
                        name={SUBJECT_LABELS[xAxisSubject]}
                        domain={[0, 10]}
                        tickCount={6}
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        label={{
                          value: `Nota de ${SUBJECT_LABELS[xAxisSubject]}`,
                          position: "bottom",
                          offset: 6,
                          style: {
                            fill: "#475569",
                            fontSize: 12,
                            fontWeight: 600,
                          },
                        }}
                      />
                      <YAxis
                        type="number"
                        dataKey={yAxisSubject}
                        name={SUBJECT_LABELS[yAxisSubject]}
                        domain={[0, 10]}
                        tickCount={6}
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        label={{
                          value: `Nota de ${SUBJECT_LABELS[yAxisSubject]}`,
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                          style: {
                            fill: "#475569",
                            fontSize: 12,
                            fontWeight: 600,
                            textAnchor: "middle",
                          },
                        }}
                      />
                      <ZAxis range={[64, 64]} />
                      <Tooltip
                        cursor={{ strokeDasharray: "4 4", stroke: "#94a3b8" }}
                        content={
                          <CustomScatterTooltip
                            xKey={xAxisSubject}
                            yKey={yAxisSubject}
                          />
                        }
                      />
                      <Scatter name="Alunos" data={filteredStudents}>
                        {filteredStudents.map((student) => (
                          <Cell
                            key={student.id}
                            fill={SHIFT_COLORS[student.turno]}
                            fillOpacity={0.85}
                            stroke="#ffffff"
                            strokeWidth={1.5}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-4">
                    {(selectedTurno === "Todos"
                      ? TURNOS_FIXOS
                      : [selectedTurno]
                    ).map((turno) => (
                      <div key={turno} className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: SHIFT_COLORS[turno] }}
                        />
                        <span className="font-medium text-slate-700">
                          {turno}
                        </span>
                      </div>
                    ))}
                  </div>
                  <span>Passe o mouse sobre os pontos para ver o aluno</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

