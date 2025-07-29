export function getRiskClasses(score) {
  if (score >= 80) return 'bg-red-600 text-white';
  if (score >= 60) return 'bg-orange-500 text-white';
  if (score >= 30) return 'bg-yellow-400 text-black';
  return 'bg-green-600 text-white';
}

export default function RiskBadge({ score }) {
  const cls = getRiskClasses(score);
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{score}</span>
  );
}
