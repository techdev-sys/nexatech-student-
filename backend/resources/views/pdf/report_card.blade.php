<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }
  .page { padding: 28px 32px; }

  /* Header */
  .header-table { width: 100%; border-bottom: 3px solid #1a1a2e; padding-bottom: 12px; margin-bottom: 16px; }
  .school-name { font-size: 18px; font-weight: bold; letter-spacing: 0.5px; }
  .school-sub  { font-size: 10px; color: #555; margin-top: 3px; }
  .badge-cell  { text-align: right; vertical-align: top; }
  .badge       { background: #1a1a2e; color: #fff; padding: 4px 12px; font-size: 10px; font-weight: bold; letter-spacing: 1px; }
  .term-label  { font-size: 10px; color: #777; margin-top: 4px; }

  /* Student info strip */
  .info-table  { width: 100%; border: 1px solid #ddd; margin-bottom: 16px; }
  .info-table td { padding: 7px 12px; border-right: 1px solid #ddd; vertical-align: top; }
  .info-table td:last-child { border-right: none; }
  .info-lbl    { font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
  .info-val    { font-size: 12px; font-weight: bold; margin-top: 2px; }

  /* Grades table */
  .grades-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  .grades-table thead tr { background: #1a1a2e; color: #fff; }
  .grades-table thead th { padding: 7px 10px; text-align: left; font-size: 10px; letter-spacing: 0.3px; }
  .grades-table tbody tr { border-bottom: 1px solid #eee; }
  .grades-table tbody tr.even { background: #f9f9fc; }
  .grades-table tbody td { padding: 7px 10px; font-size: 11px; }
  .grade-pass  { background: #d4edda; color: #155724; font-weight: bold; padding: 2px 7px; }
  .grade-fail  { background: #f8d7da; color: #721c24; font-weight: bold; padding: 2px 7px; }

  /* Summary */
  .summary-table { width: 100%; margin-bottom: 18px; }
  .summary-table td { text-align: center; border: 1px solid #ddd; padding: 8px 6px; }
  .s-val  { font-size: 18px; font-weight: bold; color: #1a1a2e; }
  .s-lbl  { font-size: 9px; text-transform: uppercase; color: #888; margin-top: 3px; letter-spacing: 0.4px; }
  .s-dark { background: #1a1a2e; border-color: #1a1a2e; }
  .s-dark .s-val, .s-dark .s-lbl { color: #fff; }
  .s-pass .s-val { color: #155724; }
  .s-fail .s-val { color: #721c24; }

  /* Section headings */
  .section-head { background: #f0f4ff; border-left: 3px solid #1a1a2e; padding: 5px 10px;
                  font-size: 10px; font-weight: bold; text-transform: uppercase;
                  letter-spacing: 0.5px; margin-bottom: 8px; }

  /* Supplementary panels */
  .supp-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .supp-table td { border: 1px solid #ddd; padding: 6px 10px; font-size: 10px; vertical-align: top; }
  .supp-lbl  { font-size: 9px; color: #888; text-transform: uppercase; }
  .supp-val  { font-size: 13px; font-weight: bold; }

  .standing-good  { color: #155724; }
  .standing-warn  { color: #856404; }
  .standing-bad   { color: #721c24; }
  .fee-clear      { color: #155724; }
  .fee-owed       { color: #721c24; }

  /* Signatures */
  .sig-table { width: 100%; margin-top: 28px; }
  .sig-table td { width: 33%; padding: 0 10px; vertical-align: bottom; }
  .sig-line { border-top: 1px solid #999; padding-top: 4px; font-size: 9px; color: #666; margin-top: 30px; }

  /* Footer */
  .footer-table { width: 100%; border-top: 1px solid #ddd; padding-top: 8px; margin-top: 16px; }
  .footer-table td { font-size: 9px; color: #aaa; }
</style>
</head>
<body>
<div class="page">

  {{-- Header --}}
  <table class="header-table">
    <tr>
      <td style="vertical-align:middle">
        <div class="school-name">{{ strtoupper($data['school']['name']) }}</div>
        <div class="school-sub">Official Academic Report Card</div>
      </td>
      <td class="badge-cell">
        <div class="badge">TERM {{ $data['term'] }} REPORT</div>
        <div class="term-label">Academic Year {{ $data['academic_year'] }}</div>
      </td>
    </tr>
  </table>

  {{-- Student info --}}
  <table class="info-table">
    <tr>
      <td>
        <div class="info-lbl">Student Name</div>
        <div class="info-val">{{ $data['student']['name'] }}</div>
      </td>
      <td>
        <div class="info-lbl">Student Number</div>
        <div class="info-val">{{ $data['student']['student_number'] ?? '—' }}</div>
      </td>
      <td>
        <div class="info-lbl">Grade / Form</div>
        <div class="info-val">{{ $data['student']['grade_level'] }}</div>
      </td>
      <td>
        <div class="info-lbl">Section</div>
        <div class="info-val">{{ $data['student']['section'] ?? '—' }}</div>
      </td>
      <td>
        <div class="info-lbl">Class Position</div>
        <div class="info-val">
          @if($data['position']['class_position'])
            {{ $data['position']['class_position'] }} / {{ $data['position']['class_size'] }}
          @else
            —
          @endif
        </div>
      </td>
    </tr>
  </table>

  {{-- Grades table --}}
  <table class="grades-table">
    <thead>
      <tr>
        <th style="width:22%">Subject</th>
        <th>Assessment Breakdown</th>
        <th style="width:10%;text-align:right">Terminal %</th>
        <th style="width:7%;text-align:center">Grade</th>
        <th style="width:10%;text-align:center">Position</th>
        <th style="width:12%">Remark</th>
      </tr>
    </thead>
    <tbody>
      @foreach($data['subjects'] as $i => $row)
      <tr class="{{ $i % 2 === 1 ? 'even' : '' }}">
        <td>
          <strong>{{ $row['subject']['name'] }}</strong><br>
          <span style="color:#888;font-size:9px">{{ $row['subject']['code'] ?? '' }}</span>
        </td>
        <td style="font-size:10px;color:#555">
          @forelse($row['assessments'] as $a)
            {{ $a['assessment'] }}:
            {{ $a['score'] !== null ? number_format($a['score'],1).'/'.number_format($a['max_marks'],0).' (wt: '.number_format($a['weighted_score'],1).')' : '—' }}@if(!$loop->last) &nbsp;|&nbsp; @endif
          @empty
            <em>No assessments recorded</em>
          @endforelse
        </td>
        <td style="text-align:right"><strong>{{ number_format($row['terminal_percentage'],1) }}%</strong></td>
        <td style="text-align:center">
          <span class="{{ $row['is_pass'] ? 'grade-pass' : 'grade-fail' }}">{{ $row['terminal_letter'] }}</span>
        </td>
        <td style="text-align:center;font-size:10px">
          @if($row['subject_position'])
            {{ $row['subject_position'] }}/{{ $row['subject_class_size'] }}
          @else
            —
          @endif
        </td>
        <td>{{ $row['terminal_label'] }}</td>
      </tr>
      @endforeach
    </tbody>
  </table>

  {{-- Academic Summary --}}
  <table class="summary-table">
    <tr>
      <td>
        <div class="s-val">{{ $data['summary']['subjects_attempted'] }}</div>
        <div class="s-lbl">Subjects Sat</div>
      </td>
      <td class="s-pass">
        <div class="s-val">{{ $data['summary']['subjects_passed'] }}</div>
        <div class="s-lbl">Passed</div>
      </td>
      <td class="s-fail">
        <div class="s-val">{{ $data['summary']['subjects_failed'] }}</div>
        <div class="s-lbl">Failed</div>
      </td>
      <td class="s-dark">
        <div class="s-val">{{ number_format($data['summary']['overall_average'],1) }}%</div>
        <div class="s-lbl">Overall Average</div>
      </td>
      <td class="s-dark">
        <div class="s-val">{{ $data['summary']['overall_letter'] }}</div>
        <div class="s-lbl">Overall Grade</div>
      </td>
      <td>
        <div class="s-val">
          @if($data['position']['class_position'])
            {{ $data['position']['class_position'] }}
          @else
            —
          @endif
        </div>
        <div class="s-lbl">Class Position</div>
      </td>
      @if($data['summary']['total_points'])
      <td>
        <div class="s-val">{{ $data['summary']['total_points'] }}</div>
        <div class="s-lbl">Total Points</div>
      </td>
      @endif
    </tr>
  </table>

  {{-- Supplementary sections --}}
  <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
    <tr>
      {{-- Attendance --}}
      <td style="width:33%;vertical-align:top;padding-right:8px">
        <div class="section-head">Attendance Summary</div>
        <table class="supp-table">
          <tr>
            <td><div class="supp-lbl">Present</div><div class="supp-val" style="color:#155724">{{ $data['attendance']['present'] }}</div></td>
            <td><div class="supp-lbl">Absent</div><div class="supp-val" style="color:#721c24">{{ $data['attendance']['absent'] }}</div></td>
            <td><div class="supp-lbl">Late</div><div class="supp-val" style="color:#856404">{{ $data['attendance']['late'] }}</div></td>
          </tr>
          <tr>
            <td colspan="3"><div class="supp-lbl">Total Days</div><div class="supp-val">{{ $data['attendance']['total'] }}</div></td>
          </tr>
        </table>
      </td>

      {{-- Behaviour --}}
      <td style="width:33%;vertical-align:top;padding:0 4px">
        <div class="section-head">Behaviour Summary</div>
        <table class="supp-table">
          <tr>
            <td><div class="supp-lbl">Total Incidents</div><div class="supp-val">{{ $data['behaviour']['total_incidents'] }}</div></td>
            <td><div class="supp-lbl">Major</div><div class="supp-val">{{ $data['behaviour']['major_incidents'] }}</div></td>
          </tr>
          <tr>
            <td colspan="2">
              <div class="supp-lbl">Standing</div>
              @php
                $sc = match($data['behaviour']['standing']) {
                    'Excellent' => 'standing-good',
                    'Good'      => 'standing-good',
                    'Satisfactory' => 'standing-warn',
                    default     => 'standing-bad'
                };
              @endphp
              <div class="supp-val {{ $sc }}">{{ $data['behaviour']['standing'] }}</div>
            </td>
          </tr>
        </table>
      </td>

      {{-- Finance --}}
      <td style="width:33%;vertical-align:top;padding-left:8px">
        <div class="section-head">Fee Status</div>
        <table class="supp-table">
          <tr>
            <td><div class="supp-lbl">Total Billed</div><div class="supp-val">${{ number_format($data['finance']['total_billed'],2) }}</div></td>
            <td><div class="supp-lbl">Total Paid</div><div class="supp-val">${{ number_format($data['finance']['total_paid'],2) }}</div></td>
          </tr>
          <tr>
            <td><div class="supp-lbl">Outstanding</div><div class="supp-val {{ $data['finance']['outstanding'] > 0 ? 'fee-owed' : 'fee-clear' }}">${{ number_format($data['finance']['outstanding'],2) }}</div></td>
            <td><div class="supp-lbl">Status</div><div class="supp-val {{ $data['finance']['outstanding'] > 0 ? 'fee-owed' : 'fee-clear' }}">{{ $data['finance']['fee_status'] }}</div></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  {{-- Signatures --}}
  <table class="sig-table">
    <tr>
      <td><div class="sig-line">Class Teacher</div></td>
      <td><div class="sig-line">Headmaster / Principal</div></td>
      <td><div class="sig-line">Parent / Guardian</div></td>
    </tr>
  </table>

  {{-- Footer --}}
  <table class="footer-table">
    <tr>
      <td>Generated: {{ \Carbon\Carbon::parse($data['compiled_at'])->format('d M Y, H:i') }}</td>
      <td style="text-align:right">{{ $data['school']['name'] }} — Confidential Academic Record</td>
    </tr>
  </table>

</div>
</body>
</html>
