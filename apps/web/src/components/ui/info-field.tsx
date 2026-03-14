export function InfoField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm">{value ?? "\u2014"}</p>
    </div>
  );
}
