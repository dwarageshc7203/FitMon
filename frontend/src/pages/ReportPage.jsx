import { createElement, useState } from 'react';
import jsPDF from 'jspdf';
import { useLocation, Link } from 'react-router-dom';
import {
  ArrowDownToLine,
  Trophy,
  Repeat,
} from 'lucide-react';

const CHART_WIDTH = 760;
const CHART_HEIGHT = 250;

export default function ReportPage() {
  const location = useLocation();
  const report = location.state?.report;
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  if (!report) {
    return (
      <div className="page report-page report-empty">
        <div className="card report-empty-card">
          <Trophy className="icon-2xl report-empty-icon" />
          <h2 className="report-title">No Report Found</h2>
          <p className="text-secondary">Complete a session to generate your workout report.</p>
          <Link to="/session" className="btn-primary button-inline">
            Start a Session
          </Link>
        </div>
      </div>
    );
  }

  const insights = report.insights || {};
  const reps = report.perRepData || [];
  const grade = insights.overallGrade || 'C';

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const calculateInjuryRisk = (postureScoreValue, averageFsrValue, repCountValue) => {
    const postureRisk = Math.max(0, 100 - postureScoreValue);

    const fsrRisk = averageFsrValue < 20
      ? (20 - averageFsrValue) * 2
      : averageFsrValue > 80
        ? (averageFsrValue - 80) * 1.5
        : 0;

    const repRisk = repCountValue > 30 ? Math.min((repCountValue - 30) * 1.5, 30) : 0;

    const totalRisk = (postureRisk * 0.5) + (fsrRisk * 0.3) + (repRisk * 0.2);

    if (totalRisk < 25) return { level: 'Low', score: Math.round(totalRisk), color: 'success' };
    if (totalRisk < 55) return { level: 'Moderate', score: Math.round(totalRisk), color: 'warning' };
    return { level: 'High', score: Math.round(totalRisk), color: 'danger' };
  };

  const averageFsrValue = Number.isFinite(report.avgFsr)
    ? report.avgFsr
    : reps.length
      ? reps.reduce((sum, rep) => sum + (rep.avgFsr ?? 0), 0) / reps.length
      : 0;
  const postureScoreValue = report.avgPostureScore ?? 0;
  const repCountValue = report.totalReps ?? 0;
  const injuryRisk = calculateInjuryRisk(postureScoreValue, averageFsrValue, repCountValue);
  const riskBadgeClass = injuryRisk.color === 'success'
    ? 'badge-success'
    : injuryRisk.color === 'warning'
      ? 'badge-warning'
      : 'badge-danger';

  async function handleDownloadPdf() {
    if (isDownloadingPdf) {
      return;
    }

    try {
      setPdfError('');
      setIsDownloadingPdf(true);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      let y = 18;

      const addSectionTitle = (title) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(28, 24, 25);
        pdf.text(title, margin, y);
        y += 7;
      };

      const addBodyText = (text) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(70, 70, 70);
        const lines = pdf.splitTextToSize(text, pageWidth - margin * 2);
        pdf.text(lines, margin, y);
        y += (lines.length * 5) + 2;
      };

      const ensureSpace = (needed = 20) => {
        if (y + needed > pageHeight - 14) {
          pdf.addPage();
          y = 18;
        }
      };

      pdf.setFillColor(255, 123, 84);
      pdf.roundedRect(margin, y, pageWidth - margin * 2, 26, 4, 4, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.text('FitMon Session Report', margin + 6, y + 11);
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date(report.startedAt).toLocaleString()}`, margin + 6, y + 19);
      y += 36;

      addSectionTitle('Overview');
      addBodyText(insights.summary || `You completed ${report.totalReps} reps with ${report.accuracy}% accuracy.`);

      ensureSpace(30);
      const metrics = [
        ['Grade', grade],
        ['Total Reps', String(report.totalReps)],
        ['Accuracy', `${report.accuracy}%`],
        ['Duration', formatDuration(report.duration)],
        ['Posture', String(report.avgPostureScore)],
        ['Injury Risk', `${injuryRisk.score}%`],
      ];

      let metricX = margin;
      metrics.forEach(([label, value], index) => {
        pdf.setFillColor(247, 244, 241);
        pdf.roundedRect(metricX, y, 28, 20, 3, 3, 'F');
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(8);
        pdf.text(label, metricX + 3, y + 6);
        pdf.setTextColor(30, 30, 30);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text(value, metricX + 3, y + 14);
        metricX += 31;
        if ((index + 1) % 3 === 0) {
          y += 24;
          metricX = margin;
        }
      });
      y += 6;

      ensureSpace(55);
      addSectionTitle('Rep Performance');
      drawPerformanceChart(pdf, reps, margin, y, pageWidth - margin * 2, 52);
      y += 60;

      ensureSpace(35);
      addSectionTitle('Risk Summary');
      addBodyText(`Injury risk score: ${injuryRisk.score}%. Incorrect reps: ${report.incorrectReps}. Ineffective reps: ${report.ineffectiveReps}.`);

      if (insights.improvements?.length) {
        ensureSpace(30);
        addSectionTitle('Improvements');
        insights.improvements.forEach((item) => addBodyText(`- ${item}`));
      }

      if (insights.warnings?.length || insights.injuryExplanation) {
        ensureSpace(30);
        addSectionTitle('Warnings');
        insights.warnings?.forEach((warning) => addBodyText(`- ${warning}`));
        if (insights.injuryExplanation) addBodyText(insights.injuryExplanation);
      }

      if (insights.positiveFeedback?.length) {
        ensureSpace(30);
        addSectionTitle('What Went Well');
        insights.positiveFeedback.forEach((item) => addBodyText(`- ${item}`));
      }

      if (reps.length) {
        ensureSpace(45);
        addSectionTitle('Rep History');
        drawRepTable(pdf, reps, margin, y, pageWidth - margin * 2);
      }

      pdf.save(`fitmon-report-${report.sessionId || 'session'}.pdf`);
    } catch (error) {
      setPdfError(error?.message || 'PDF generation failed in this browser session.');
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  return (
    <div className="page report-page">
      <div className="container container-narrow" style={{ maxWidth: '800px', padding: '32px 24px' }}>
        <div className={`${riskBadgeClass}`} style={{ fontSize: '0.85rem', padding: '8px 18px' }}>
          {injuryRisk.level} Risk · {injuryRisk.score}%
        </div>

        <div style={{ marginTop: '24px', marginBottom: '32px' }}>
          <p className="section-label">Session Report</p>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>
            Your workout report
          </h1>
          <p className="text-secondary" style={{ marginTop: '8px' }}>
            {new Date(report.startedAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {pdfError ? (
          <div className="camera-error camera-error-inline report-error">
            <div>
              <strong>PDF download issue</strong>
              <p>{pdfError}</p>
            </div>
          </div>
        ) : null}

        <section>
          <h2 className="report-section-title">Overview</h2>
          <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
            <MetricRow label="Total Reps" value={report.totalReps} />
            <MetricRow label="Accuracy" value={`${report.accuracy}%`} />
            <MetricRow label="Duration" value={formatDuration(report.duration)} />
            <MetricRow label="Posture Score" value={report.avgPostureScore} />
            <MetricRow label="Pressure" value={Math.round(averageFsrValue || 0)} />
            <MetricRow label="Injury Risk" value={`${injuryRisk.score}% (${injuryRisk.level})`} />
          </div>
        </section>

        <section style={{ marginTop: '32px' }}>
          <h2 className="report-section-title">Summary</h2>
          <p className="text-secondary" style={{ marginTop: '16px' }}>
            {insights.summary || `You completed ${report.totalReps} reps with ${report.accuracy}% accuracy.`}
          </p>
        </section>

        {insights.improvements?.length ? (
          <section style={{ marginTop: '32px' }}>
            <h2 className="report-section-title">Improvements</h2>
            <ul className="report-list" style={{ marginTop: '16px' }}>
              {insights.improvements.map((item) => (
                <li key={item} className="report-list-item">
                  <span className="text-warning">{'->'}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {insights.positiveFeedback?.length ? (
          <section style={{ marginTop: '32px' }}>
            <h2 className="report-section-title">What Went Well</h2>
            <ul className="report-list" style={{ marginTop: '16px' }}>
              {insights.positiveFeedback.map((item) => (
                <li key={item} className="report-list-item">
                  <span className="text-success">OK</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {(insights.warnings?.length || insights.injuryExplanation) ? (
          <section style={{ marginTop: '32px' }}>
            <h2 className="report-section-title">Caution</h2>
            <div className="report-warning-body" style={{ marginTop: '16px' }}>
              {insights.warnings?.map((warning) => <p key={warning}>Alert: {warning}</p>)}
              {insights.injuryExplanation ? <p>{insights.injuryExplanation}</p> : null}
            </div>
          </section>
        ) : null}

        {reps.length ? (
          <section style={{ marginTop: '32px' }}>
            <h2 className="report-section-title">Rep History</h2>
            <div className="report-table-wrap" style={{ marginTop: '16px' }}>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Rep</th>
                    <th>Form Score</th>
                    <th>Pressure Score</th>
                    <th>Avg Pressure</th>
                    <th>Range</th>
                    <th>Consistency</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reps.map((rep) => (
                    <tr key={rep.repNumber}>
                      <td className="table-strong">#{rep.repNumber}</td>
                      <td>
                        <span className={`table-strong ${rep.formScore >= 60 ? 'text-success' : 'text-danger'}`}>{rep.formScore}</span>
                      </td>
                      <td className="text-secondary">{rep.fsrScore ?? '-'}</td>
                      <td className="text-secondary">{rep.avgFsr ?? '-'}</td>
                      <td className="text-secondary">
                        {rep.minAngle !== null && rep.maxAngle !== null ? `${Math.round(rep.minAngle)}° - ${Math.round(rep.maxAngle)}°` : '-'}
                      </td>
                      <td className="text-secondary">{rep.fusionScore ?? '-'}</td>
                      <td>
                        {rep.correct ? (
                          <span className="text-success">Good</span>
                        ) : (
                          <span className="text-danger">Needs Work</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <div className="report-footer" style={{ marginTop: '40px' }}>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="btn-secondary button-inline"
          >
            <ArrowDownToLine className="icon-sm" />
            {isDownloadingPdf ? 'Generating PDF...' : 'Download Report'}
          </button>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <Link to="/session" className="btn-primary button-inline">
            <Repeat className="icon-sm" />
            Start New Session
          </Link>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

function RepPerformanceChart({ reps }) {
  if (!reps.length) {
    return <EmptyChartState message="Complete more reps to render a performance graph." />;
  }

  const maxScore = Math.max(100, ...reps.flatMap((rep) => [rep.formScore ?? 0, rep.fsrScore ?? 0, rep.fusionScore ?? 0]));
  const leftPadding = 28;
  const bottomPadding = 26;
  const topPadding = 20;
  const usableWidth = CHART_WIDTH - leftPadding - 20;
  const usableHeight = CHART_HEIGHT - topPadding - bottomPadding;
  const stepX = reps.length > 1 ? usableWidth / (reps.length - 1) : 0;

  const lineFromKey = (key) =>
    reps
      .map((rep, index) => {
        const value = rep[key] ?? 0;
        const x = leftPadding + (stepX * index);
        const y = topPadding + usableHeight - ((value / maxScore) * usableHeight);
        return `${x},${y}`;
      })
      .join(' ');

  return (
    <div className="report-chart-shell">
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full h-auto">
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = topPadding + usableHeight - ((tick / maxScore) * usableHeight);
          return (
            <g key={tick}>
              <line x1={leftPadding} x2={CHART_WIDTH - 12} y1={y} y2={y} stroke="var(--border)" strokeDasharray="4 8" />
              <text x={0} y={y + 4} fill="var(--muted)" fontSize="11">
                {tick}
              </text>
            </g>
          );
        })}

        <polyline fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" points={lineFromKey('formScore')} />
        <polyline fill="none" stroke="var(--blue)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" points={lineFromKey('fsrScore')} />
        <polyline fill="none" stroke="var(--warning)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" points={lineFromKey('fusionScore')} />

        {reps.map((rep, index) => {
          const x = leftPadding + (stepX * index);
          const formY = topPadding + usableHeight - (((rep.formScore ?? 0) / maxScore) * usableHeight);
          return (
            <g key={rep.repNumber}>
              <circle cx={x} cy={formY} r="5" fill="var(--accent)" />
              <text x={x} y={CHART_HEIGHT - 6} textAnchor="middle" fill="var(--muted)" fontSize="11">
                {rep.repNumber}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="report-chart-legend">
        <LegendDot color="var(--accent)" label="Form Score" />
        <LegendDot color="var(--blue)" label="Pressure Score" />
        <LegendDot color="var(--warning)" label="Consistency Score" />
      </div>
    </div>
  );
}

function RiskGauge({ riskScore }) {
  const clamped = Math.max(0, Math.min(100, riskScore || 0));
  const rotation = -90 + (clamped / 100) * 180;
  const tone = clamped >= 60 ? 'danger' : clamped >= 30 ? 'warning' : 'safe';

  return (
    <div className="risk-gauge">
      <div className="risk-gauge__dial">
        <div className="risk-gauge__arc" />
        <div className={`risk-gauge__needle risk-gauge__needle--${tone}`} style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }} />
        <div className="risk-gauge__center">
          <span className="risk-gauge__value">{clamped}%</span>
          <span className="risk-gauge__label">Risk Score</span>
        </div>
      </div>
      <div className="risk-gauge__scale">
        <span>Safe</span>
        <span>Watch</span>
        <span>High</span>
      </div>
    </div>
  );
}

function drawPerformanceChart(pdf, reps, x, y, width, height) {
  if (!reps.length) {
    pdf.setFontSize(10);
    pdf.text('Not enough rep data to plot the chart.', x, y + 10);
    return;
  }

  const chartWidth = width;
  const chartHeight = height;
  const maxScore = Math.max(100, ...reps.flatMap((rep) => [rep.formScore ?? 0, rep.fsrScore ?? 0, rep.fusionScore ?? 0]));

  pdf.setDrawColor(220, 220, 220);
  pdf.roundedRect(x, y, chartWidth, chartHeight, 2, 2);

  for (let i = 0; i <= 4; i += 1) {
    const gridY = y + 6 + ((chartHeight - 14) / 4) * i;
    pdf.setDrawColor(230, 230, 230);
    pdf.line(x + 8, gridY, x + chartWidth - 6, gridY);
  }

  const pointsFor = (key) =>
    reps.map((rep, index) => {
      const px = x + 12 + (index * ((chartWidth - 24) / Math.max(1, reps.length - 1)));
      const value = rep[key] ?? 0;
      const py = y + chartHeight - 8 - ((value / maxScore) * (chartHeight - 18));
      return [px, py];
    });

  const drawSeries = (points, color) => {
    pdf.setDrawColor(...color);
    pdf.setLineWidth(1.2);
    for (let i = 1; i < points.length; i += 1) {
      pdf.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
    }
    points.forEach(([px, py]) => {
      pdf.setFillColor(...color);
      pdf.circle(px, py, 1.2, 'F');
    });
  };

  drawSeries(pointsFor('formScore'), [255, 123, 84]);
  drawSeries(pointsFor('fsrScore'), [122, 215, 240]);
  drawSeries(pointsFor('fusionScore'), [247, 197, 107]);

  pdf.setFontSize(8);
  pdf.setTextColor(90, 90, 90);
  reps.forEach((rep, index) => {
    const px = x + 12 + (index * ((chartWidth - 24) / Math.max(1, reps.length - 1)));
    pdf.text(String(rep.repNumber), px - 1.5, y + chartHeight - 2);
  });
}

function drawRepTable(pdf, reps, x, startY, width) {
  let y = startY;
  const rowHeight = 7;
  const columns = [
    ['Rep', 14],
    ['Form', 22],
    ['Press', 18],
    ['Avg', 20],
    ['Range', 30],
    ['Consist', 24],
    ['Status', 22],
  ];

  pdf.setFillColor(245, 245, 245);
  pdf.rect(x, y, width, rowHeight, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  let currentX = x + 2;
  columns.forEach(([label, colWidth]) => {
    pdf.text(label, currentX, y + 4.8);
    currentX += colWidth;
  });
  y += rowHeight;

  pdf.setFont('helvetica', 'normal');
  reps.slice(0, 18).forEach((rep) => {
    currentX = x + 2;
    const values = [
      `#${rep.repNumber}`,
      String(rep.formScore ?? '-'),
      String(rep.fsrScore ?? '-'),
      String(rep.avgFsr ?? '-'),
      rep.minAngle !== null && rep.maxAngle !== null ? `${Math.round(rep.minAngle)}-${Math.round(rep.maxAngle)}` : '-',
      String(rep.fusionScore ?? '-'),
      rep.correct ? 'Good' : 'Needs Work',
    ];
    values.forEach((value, index) => {
      pdf.text(value, currentX, y + 4.8);
      currentX += columns[index][1];
    });
    y += rowHeight;
  });
}

function MiniRiskMetric({ label, value, tone }) {
  return (
    <div className="card mini-risk-card">
      <p className="metric-label">{label}</p>
      <p className={`metric-value ${tone}`}>{value}</p>
    </div>
  );
}

function EmptyChartState({ message }) {
  return (
    <div className="report-empty-chart">
      <p>{message}</p>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="legend-dot">
      <span className="report-legend-dot" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function MetricCard({ icon, label, value, color = 'text-primary' }) {
  return (
    <div className="card report-metric">
      {createElement(icon, { className: 'icon-md text-accent' })}
      <p className={`metric-value tabular-nums ${color}`}>{value}</p>
      <p className="metric-label">{label}</p>
    </div>
  );
}
