export type SlidingClockTimeProps = {
  time: string;
  className?: string;
};

export function isDigits(value: string): boolean {
  return /^\d+$/.test(value);
}
