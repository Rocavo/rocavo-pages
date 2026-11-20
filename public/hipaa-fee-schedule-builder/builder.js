/* Builds the text of a fee schedule page as 45 CFR 164.525 describes it.
   Pure functions, no network, no storage. No amount is ever supplied by this code:
   every fee shown is text the practice typed. */
(function (root) {
  'use strict';

  // Access that 45 CFR 164.524(c)(4)(ii), as amended, says may not carry a fee.
  var FREE_BY_RULE = [
    'Looking at (inspecting) your own health information in person.',
    'Getting your electronic health information that we hold through an internet-based method, such as a personal health application.'
  ];
  // Row labels only. Fees are left empty for the practice to fill in.
  var PATIENT_ROWS = ['Paper copies', 'Electronic copies sent by email or made available online', 'Electronic copies on a disc or USB drive', 'Copies of films or images', 'Mailing a paper copy (postage)', 'A written summary or explanation, when you agree to one in advance'];
  var AUTH_ROWS = ['Paper copies', 'Electronic copies'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function rows(list) {
    var out = [];
    (list || []).forEach(function (r) {
      var what = clean(r && r.what), fee = clean(r && r.fee);
      if (what && fee) out.push({ what: what, fee: fee });
    });
    return out;
  }
  function incomplete(list) {
    return (list || []).filter(function (r) { return clean(r && r.what) && !clean(r && r.fee); }).map(function (r) { return clean(r.what); });
  }

  function model(input) {
    input = input || {};
    var extra = (input.extraFree || []).map(clean).filter(Boolean);
    return {
      practice: clean(input.practice),
      updated: clean(input.updated),
      contact: clean(input.contact),
      free: FREE_BY_RULE.concat(extra),
      patient: rows(input.patientRows),
      auth: rows(input.authRows),
      missingFees: incomplete(input.patientRows).concat(incomplete(input.authRows)),
      howTotal: clean(input.howTotal)
    };
  }

  /* The schedule says "We do not charge for these copies" for a section only when the practice
     has ticked the box that says so. An empty fee table alone is not taken as that statement. */
  function check(input) {
    input = input || {};
    var m = model(input), errors = [];
    if (!m.patient.length && !input.confirmFreePatient) errors.push('You entered no fee for copies of a patient\'s own records. Add your fees, or tick the box in step 5 to say you do not charge for them.');
    if (!m.auth.length && !input.confirmFreeAuth) errors.push('You entered no fee for copies sent with the patient\'s written authorization. Add your fees, or tick the box in step 5 to say you do not charge for them.');
    return { ok: errors.length === 0, errors: errors };
  }

  function table(list) {
    var h = '<table>\n  <thead><tr><th scope="col">Type of copy</th><th scope="col">Our standard fee</th></tr></thead>\n  <tbody>\n';
    list.forEach(function (r) { h += '    <tr><td>' + esc(r.what) + '</td><td>' + esc(r.fee) + '</td></tr>\n'; });
    return h + '  </tbody>\n</table>\n';
  }

  function html(input) {
    var m = model(input);
    var name = m.practice || '[Practice name]';
    var h = '<section class="records-fee-schedule">\n';
    h += '<h2>Fees for copies of health records</h2>\n';
    h += '<p>' + esc(name) + (m.updated ? ' &middot; Fee schedule as of ' + esc(m.updated) : '') + '</p>\n';
    h += '<h3>Access that is free of charge</h3>\n<ul>\n';
    m.free.forEach(function (f) { h += '  <li>' + esc(f) + '</li>\n'; });
    h += '</ul>\n';
    h += '<h3>Copies of your own records, for you or sent where you ask</h3>\n';
    h += m.patient.length ? table(m.patient) : '<p>We do not charge for these copies.</p>\n';
    h += '<h3>Copies we send to someone else with your written authorization</h3>\n';
    h += m.auth.length ? table(m.auth) : '<p>We do not charge for these copies.</p>\n';
    if (m.howTotal) h += '<h3>How the total fee is worked out</h3>\n<p>' + esc(m.howTotal) + '</p>\n';
    if (m.contact) h += '<p>Questions about these fees, or to ask for this schedule on paper: ' + esc(m.contact) + '</p>\n';
    h += '</section>';
    return h;
  }

  function text(input) {
    var m = model(input);
    var L = [];
    L.push('FEES FOR COPIES OF HEALTH RECORDS');
    L.push((m.practice || '[Practice name]') + (m.updated ? ' - Fee schedule as of ' + m.updated : ''));
    L.push('');
    L.push('Access that is free of charge');
    m.free.forEach(function (f) { L.push('  - ' + f); });
    L.push('');
    L.push('Copies of your own records, for you or sent where you ask');
    if (m.patient.length) m.patient.forEach(function (r) { L.push('  - ' + r.what + ': ' + r.fee); }); else L.push('  We do not charge for these copies.');
    L.push('');
    L.push('Copies we send to someone else with your written authorization');
    if (m.auth.length) m.auth.forEach(function (r) { L.push('  - ' + r.what + ': ' + r.fee); }); else L.push('  We do not charge for these copies.');
    if (m.howTotal) { L.push(''); L.push('How the total fee is worked out'); L.push('  ' + m.howTotal); }
    if (m.contact) { L.push(''); L.push('Questions about these fees, or to ask for this schedule on paper: ' + m.contact); }
    return L.join('\n');
  }

  var api = { FREE_BY_RULE: FREE_BY_RULE, PATIENT_ROWS: PATIENT_ROWS, AUTH_ROWS: AUTH_ROWS, esc: esc, model: model, check: check, html: html, text: text };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FeeSchedule = api;
})(typeof self !== 'undefined' ? self : this);
