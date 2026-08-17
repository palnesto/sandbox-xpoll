type MailOptions = {
  to: string | string[] | null | undefined;
  subject?: string | null;
  body?: string | null;
  cc?: string | string[] | null;
  bcc?: string | string[] | null;
};

export function openSystemMailClient(options: MailOptions): void {
  if (!options?.to) return; // no recipient → do nothing

  const normalizeList = (
    value?: string | string[] | null,
  ): string | undefined => {
    if (!value) return undefined;

    const result = Array.isArray(value)
      ? value.filter(Boolean).join(",")
      : value.trim();

    return result || undefined;
  };

  const to = normalizeList(options.to);
  if (!to) return;

  const params = new URLSearchParams();

  const subject = normalizeList(options.subject);
  const body = normalizeList(options.body);
  const cc = normalizeList(options.cc);
  const bcc = normalizeList(options.bcc);

  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  if (cc) params.set("cc", cc);
  if (bcc) params.set("bcc", bcc);

  const query = params.toString();
  const mailtoUrl = `mailto:${to}${query ? `?${query}` : ""}`;

  // Triggers system default mail handler
  window.location.href = mailtoUrl;
}
