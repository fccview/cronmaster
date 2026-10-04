export const generateShortUUID = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const part1 = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  const part2 = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');

  return `${part1}-${part2}`;
};
