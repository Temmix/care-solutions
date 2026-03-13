const riskStyles: Record<string, string> = {
  NONE: 'bg-slate-50 text-slate-600',
  LOW: 'bg-green-50 text-green-700',
  MEDIUM: 'bg-amber-50 text-amber-700',
  HIGH: 'bg-red-50 text-red-700',
  VERY_HIGH: 'bg-red-100 text-red-800',
};

const riskLabels: Record<string, string> = {
  NONE: 'No Risk',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  VERY_HIGH: 'Very High',
};

interface Props {
  riskLevel: string;
}

export function RiskLevelBadge({ riskLevel }: Props): React.ReactElement {
  const style = riskStyles[riskLevel] ?? 'bg-slate-100 text-slate-500';
  const label = riskLabels[riskLevel] ?? riskLevel;

  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${style}`}>
      {label}
    </span>
  );
}
