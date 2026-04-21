export default function CircularTextBadge({
  text = 'FitMon Motion Lab',
  centerText = 'AI',
  className = '',
}) {
  const characters = `${text} • `.split('');

  return (
    <div className={`circular-badge ${className}`}>
      <div className="circular-badge__ring" aria-hidden="true">
        {characters.map((char, index) => (
          <span
            key={`${char}-${index}`}
            style={{ transform: `rotate(${index * (360 / characters.length)}deg)` }}
          >
            {char}
          </span>
        ))}
      </div>
      <div className="circular-badge__center">{centerText}</div>
    </div>
  );
}
