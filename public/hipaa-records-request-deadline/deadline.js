/* Date arithmetic for the HIPAA right-of-access time limits (45 CFR 164.524(b)(2)).
   Pure functions, no network, no storage. Runs in the browser and under Node for tests.
   Sources and the date they were read are on the page and in PROBE.md. */
(function (root) {
  'use strict';

  // Dates as printed in the DATES section of 91 FR 74848 (November 19, 2026). Do not derive them:
  // 60 and 240 days after publication fall on a holiday and a Saturday and were moved to the next business day.
  var PUBLISHED = '2026-11-19';
  var EFFECTIVE_DATE = '2027-01-19';
  var COMPLIANCE_DATE = '2027-07-19';
  var RULES = {
    current: { key: 'current', days: 30, extension: 30, total: 60, unit: 'days' },
    amended: { key: 'amended', days: 15, extension: 30, total: 45, unit: 'calendar days' }
  };

  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var t = Date.UTC(y, mo - 1, d);
    var dt = new Date(t);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    if (y < 2003 || y > 2100) return null;
    return t;
  }
  function toISO(t) {
    var d = new Date(t);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
  }
  // The day after receipt is day 1, so the limit falls on receipt + N days.
  function addDays(iso, n) {
    var t = parseISO(iso);
    if (t === null) return null;
    return toISO(t + n * 86400000);
  }
  function weekday(iso) { return new Date(parseISO(iso)).getUTCDay(); } // 0 Sunday .. 6 Saturday
  function isWeekend(iso) { var w = weekday(iso); return w === 0 || w === 6; }

  var WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function formatLong(iso) {
    var d = new Date(parseISO(iso));
    return WD[d.getUTCDay()] + ', ' + MO[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
  }
  function formatPlain(iso) {
    var d = new Date(parseISO(iso));
    return MO[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
  }

  function datesFor(received, rule) {
    var due = addDays(received, rule.days);
    var ext = addDays(received, rule.total);
    return {
      rule: rule.key, days: rule.days, extensionDays: rule.extension, totalDays: rule.total, unit: rule.unit,
      due: due, dueIsWeekend: isWeekend(due),
      statementBy: due,               // the written statement must go out within the original limit
      extendedDue: ext, extendedDueIsWeekend: isWeekend(ext)
    };
  }

  /* regime:
     'amended'    request received on or after the compliance date: 15 calendar days
     'transition' received before the compliance date, but the 30-day limit ends on or after it:
                  both sets of dates are returned; the rule text read does not address open requests
     'current'    received before the compliance date and the 30-day limit ends before it */
  function compute(received) {
    if (parseISO(received) === null) return { ok: false, error: 'Enter the date the request was received.' };
    var cur = datesFor(received, RULES.current);
    var amd = datesFor(received, RULES.amended);
    var regime;
    if (received >= COMPLIANCE_DATE) regime = 'amended';
    else if (cur.due >= COMPLIANCE_DATE) regime = 'transition';
    else regime = 'current';
    return {
      ok: true, received: received, regime: regime,
      complianceDate: COMPLIANCE_DATE, effectiveDate: EFFECTIVE_DATE,
      showEarly: regime === 'current' && received >= PUBLISHED,
      current: regime === 'amended' ? null : cur,
      amended: amd,
      primary: regime === 'current' ? cur : amd
    };
  }

  /* Checks a completion date the practice wants to put in the extension statement. */
  function checkNewDate(dates, newDate) {
    if (parseISO(newDate) === null) return { ok: false, error: 'Enter the date by which you will act on the request.' };
    if (newDate <= dates.due) return { ok: false, error: 'That date is inside the original time limit, so no extension is needed.' };
    if (newDate > dates.extendedDue) return { ok: false, error: 'That date is later than the longest extension the rule allows (' + formatPlain(dates.extendedDue) + ').' };
    return { ok: true };
  }

  function letter(o) {
    var d = o.dates;
    var limit = d.rule === 'amended' ? '15 calendar days' : '30 days';
    var reasons = String(o.reasons || '').trim();
    var lines = [];
    lines.push(String(o.practice || '').trim() || '[Practice name and address]');
    lines.push('');
    lines.push(o.letterDate ? formatPlain(o.letterDate) : '[Date of this letter]');
    lines.push('');
    lines.push('[Patient name and address]');
    lines.push('');
    lines.push('Re: Your request for access to your health information, received ' + formatPlain(o.received));
    lines.push('');
    lines.push('We received your request on ' + formatPlain(o.received) + '. We are not able to act on it within ' + limit + ' of receiving it. The reason for the delay is:');
    lines.push('');
    lines.push(reasons || '[Write the reason or reasons for the delay here.]');
    lines.push('');
    lines.push('We will complete our action on your request by ' + formatPlain(o.newDate) + '.');
    lines.push('');
    lines.push('If you have questions about your request, contact ' + (String(o.contact || '').trim() || '[name or office, and phone number]') + '.');
    lines.push('');
    lines.push('Sincerely,');
    lines.push('');
    lines.push('[Name and title]');
    return lines.join('\n');
  }

  var api = { PUBLISHED: PUBLISHED, COMPLIANCE_DATE: COMPLIANCE_DATE, EFFECTIVE_DATE: EFFECTIVE_DATE, RULES: RULES,
    parseISO: parseISO, addDays: addDays, isWeekend: isWeekend, weekday: weekday,
    formatLong: formatLong, formatPlain: formatPlain, compute: compute, checkNewDate: checkNewDate, letter: letter };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AccessDeadline = api;
})(typeof self !== 'undefined' ? self : this);
