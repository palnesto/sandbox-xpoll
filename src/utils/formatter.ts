export function truncateWallet(
  address: string | null,
  frontChars: number = 6,
  backChars: number = 6
): string {
  if (!address) return ""; // gracefully handle null or empty string
  if (address.length <= frontChars + backChars) return address;
  return `${address.slice(0, frontChars)}...${address.slice(-backChars)}`;
}
