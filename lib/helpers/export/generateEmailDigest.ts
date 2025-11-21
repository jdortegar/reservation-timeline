import { format, parseISO } from 'date-fns';
import type { Reservation, Table } from '@/lib/types/Reservation';
import { calculateStatistics, calculateShiftStatistics } from '../reports/calculateStatistics';

interface EmailDigestOptions {
  date: string;
  restaurantName?: string;
  includeReservationList?: boolean;
}

export function generateEmailDigest(
  reservations: Reservation[],
  tables: Table[],
  options: EmailDigestOptions,
): string {
  const { date, restaurantName = 'Restaurant', includeReservationList = false } = options;
  const stats = calculateStatistics(reservations, tables, date);
  const lunchStats = calculateShiftStatistics(reservations, tables, 'lunch');
  const dinnerStats = calculateShiftStatistics(reservations, tables, 'dinner');

  const formattedDate = format(parseISO(`${date}T12:00:00`), 'EEEE, MMMM d, yyyy');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservation Digest - ${formattedDate}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin-top: 0;">${restaurantName} - Reservation Digest</h1>
    <p style="color: #7f8c8d; margin-bottom: 0;"><strong>Date:</strong> ${formattedDate}</p>
  </div>

  <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e0e0e0;">
    <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Summary Statistics</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Total Reservations:</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${stats.totalReservations}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Total Covers:</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${stats.totalCovers}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Average Party Size:</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${stats.averagePartySize}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Table Utilization:</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${stats.tableUtilization}%</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Cancelled:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${stats.cancelledCount}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>No Shows:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${stats.noShowCount}</td>
      </tr>
    </table>
  </div>

  <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e0e0e0;">
    <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Shift Breakdown</h2>
    
    <div style="margin-bottom: 20px;">
      <h3 style="color: #34495e; margin-bottom: 10px;">Lunch (11:00 - 15:00)</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0;">Reservations:</td>
          <td style="padding: 6px 0; text-align: right;"><strong>${lunchStats.reservations.length}</strong></td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">Total Covers:</td>
          <td style="padding: 6px 0; text-align: right;"><strong>${lunchStats.totalCovers}</strong></td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">Average Party Size:</td>
          <td style="padding: 6px 0; text-align: right;"><strong>${lunchStats.averagePartySize}</strong></td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">Table Utilization:</td>
          <td style="padding: 6px 0; text-align: right;"><strong>${lunchStats.tableUtilization}%</strong></td>
        </tr>
      </table>
    </div>

    <div>
      <h3 style="color: #34495e; margin-bottom: 10px;">Dinner (18:00 - 23:00)</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0;">Reservations:</td>
          <td style="padding: 6px 0; text-align: right;"><strong>${dinnerStats.reservations.length}</strong></td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">Total Covers:</td>
          <td style="padding: 6px 0; text-align: right;"><strong>${dinnerStats.totalCovers}</strong></td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">Average Party Size:</td>
          <td style="padding: 6px 0; text-align: right;"><strong>${dinnerStats.averagePartySize}</strong></td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">Table Utilization:</td>
          <td style="padding: 6px 0; text-align: right;"><strong>${dinnerStats.tableUtilization}%</strong></td>
        </tr>
      </table>
    </div>
  </div>

  ${includeReservationList ? generateReservationList(reservations, tables) : ''}

  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
    <p style="margin: 0;">Generated on ${format(new Date(), 'MMMM d, yyyy at h:mm a')}</p>
  </div>
</body>
</html>
  `.trim();
}

function generateReservationList(
  reservations: Reservation[],
  tables: Table[],
): string {
  if (reservations.length === 0) {
    return '<p>No reservations for this date.</p>';
  }

  let html = `
    <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e0e0e0;">
      <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Reservations</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #f8f9fa; border-bottom: 2px solid #ddd;">
            <th style="padding: 10px; text-align: left;">Time</th>
            <th style="padding: 10px; text-align: left;">Customer</th>
            <th style="padding: 10px; text-align: left;">Table</th>
            <th style="padding: 10px; text-align: right;">Party</th>
            <th style="padding: 10px; text-align: left;">Status</th>
          </tr>
        </thead>
        <tbody>
  `;

  reservations.forEach((reservation) => {
    const startDate = parseISO(reservation.startTime);
    const endDate = parseISO(reservation.endTime);
    const table = tables.find((t) => t.id === reservation.tableId);
    const timeRange = `${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`;

    html += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px 10px;">${timeRange}</td>
        <td style="padding: 8px 10px;">${escapeHtml(reservation.customer.name)}</td>
        <td style="padding: 8px 10px;">${table?.name || 'Unknown'}</td>
        <td style="padding: 8px 10px; text-align: right;">${reservation.partySize}</td>
        <td style="padding: 8px 10px;">
          <span style="padding: 2px 8px; border-radius: 4px; background-color: #e0e0e0; font-size: 12px;">
            ${reservation.status}
          </span>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

