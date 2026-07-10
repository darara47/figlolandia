const { createHash } = require('crypto');

const SEVERITY_RANK = { INFO: 0, WARNING: 1, ERROR: 2, CRITICAL: 3 };

const maxSeverity = (findings) => {
  let max = 'INFO';
  for (const f of findings) {
    if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[max]) {
      max = f.severity;
    }
  }
  return max;
};

const canonicalEndRoundSnapshots = (report) => {
  const result = {};
  for (const roundAnalysis of report.rounds) {
    const endSnapshot = roundAnalysis.detail.snapshots.find(
      (s) => s.label === 'END_ROUND',
    );
    if (!endSnapshot || !endSnapshot.state) continue;

    const roundKey = String(roundAnalysis.detail.round?.roundNumber ?? 0);
    result[roundKey] = {};

    for (const player of endSnapshot.state.players ?? []) {
      const buildingTypes = [...(player.buildings ?? [])]
        .map((b) => b.type ?? b.buildingType)
        .filter(Boolean)
        .sort();
      result[roundKey][player.id] = {
        gold: player.gold,
        profession: player.profession ?? null,
        cardCount: (player.cards ?? []).length,
        buildingCount: (player.buildings ?? []).length,
        buildingTypes,
      };
    }
  }
  return result;
};

const hashCanonical = (canonical) =>
  createHash('sha256').update(JSON.stringify(canonical)).digest('hex');

const assertExpectations = (report, expect, scenarioName) => {
  const errors = [];

  if (expect.validation?.allOk === true) {
    if (report.summary.validation.failed > 0) {
      errors.push(
        `${scenarioName}: validation failed (${report.summary.validation.failed} checks)`,
      );
    }
  }

  if (expect.validation?.allowedFailures) {
    const failed = Object.values(report.summary.validation.byRound)
      .flat()
      .filter((v) => v.status !== 'OK');
    for (const failure of failed) {
      const allowed = expect.validation.allowedFailures.find(
        (a) => a.checkName === failure.checkName && a.status === failure.status,
      );
      if (!allowed) {
        errors.push(
          `${scenarioName}: unexpected validation failure ${failure.checkName}=${failure.status}`,
        );
      }
    }
  }

  if (expect.replay?.allSegmentsVerified === true) {
    if (!report.health.replayOk) {
      errors.push(`${scenarioName}: replay segment verification failed`);
    }
  }

  if (expect.investigation?.maxSeverity) {
    const actual = maxSeverity(report.summary.investigation.findings);
    if (
      SEVERITY_RANK[actual] > SEVERITY_RANK[expect.investigation.maxSeverity]
    ) {
      errors.push(
        `${scenarioName}: investigation severity ${actual} exceeds max ${expect.investigation.maxSeverity}`,
      );
    }
  }

  if (expect.investigation?.requiredIssueTypes) {
    const types = new Set(
      report.summary.investigation.findings.map((f) => f.issueType),
    );
    for (const required of expect.investigation.requiredIssueTypes) {
      if (!types.has(required)) {
        errors.push(
          `${scenarioName}: missing expected investigation issue ${required}`,
        );
      }
    }
  }

  if (expect.eventCounts) {
    for (const [type, count] of Object.entries(expect.eventCounts)) {
      if (report.eventCounts[type] !== count) {
        errors.push(
          `${scenarioName}: event count ${type} expected ${count}, got ${report.eventCounts[type] ?? 0}`,
        );
      }
    }
  }

  if (expect.snapshots?.END_ROUND) {
    const canonical = canonicalEndRoundSnapshots(report);
    for (const [playerId, expected] of Object.entries(
      expect.snapshots.END_ROUND,
    )) {
      const round1 = canonical['1'];
      if (!round1 || !round1[playerId]) {
        errors.push(
          `${scenarioName}: missing END_ROUND snapshot for ${playerId} in round 1`,
        );
        continue;
      }
      const actual = round1[playerId];
      for (const [key, value] of Object.entries(expected)) {
        if (JSON.stringify(actual[key]) !== JSON.stringify(value)) {
          errors.push(
            `${scenarioName}: snapshot ${playerId}.${key} expected ${JSON.stringify(value)}, got ${JSON.stringify(actual[key])}`,
          );
        }
      }
    }
  }

  return errors;
};

module.exports = {
  SEVERITY_RANK,
  maxSeverity,
  canonicalEndRoundSnapshots,
  hashCanonical,
  assertExpectations,
};
