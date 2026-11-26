export function downloadCalendarEvent(params: {
  title: string;
  description: string;
  dateIso: string; // YYYY-MM-DD
  filename?: string;
}): void {
  const cleanDate = params.dateIso.replace(/-/g, '');
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `autolife-${Date.now()}@autolifeworld.app`;

  const escapeIcs = (text: string) =>
    text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AutoLife World//Vehicle Care Reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART;VALUE=DATE:${cleanDate}`,
    `SUMMARY:${escapeIcs(params.title)}`,
    `DESCRIPTION:${escapeIcs(params.description)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT12H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(params.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', params.filename || 'autolife-reminder.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
