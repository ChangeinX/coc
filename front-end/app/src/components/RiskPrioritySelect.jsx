import React from 'react';

export const PRESETS = {
  balanced: {
    label: 'Balanced',
    weights: {
      risk_weight_war: 0.4,
      risk_weight_idle: 0.35,
      risk_weight_don_deficit: 0.15,
      risk_weight_don_drop: 0.1,
    },
  },
  war: {
    label: 'War Focused',
    weights: {
      risk_weight_war: 0.6,
      risk_weight_idle: 0.25,
      risk_weight_don_deficit: 0.1,
      risk_weight_don_drop: 0.05,
    },
  },
  donor: {
    label: 'Donation Focused',
    weights: {
      risk_weight_war: 0.3,
      risk_weight_idle: 0.25,
      risk_weight_don_deficit: 0.35,
      risk_weight_don_drop: 0.1,
    },
  },
  idle: {
    label: 'Idle Focused',
    weights: {
      risk_weight_war: 0.2,
      risk_weight_idle: 0.6,
      risk_weight_don_deficit: 0.1,
      risk_weight_don_drop: 0.1,
    },
  },
};

export function getPreset(weights) {
  for (const [key, preset] of Object.entries(PRESETS)) {
    const w = preset.weights;
    if (
      Math.abs(w.risk_weight_war - weights.risk_weight_war) < 0.01 &&
      Math.abs(w.risk_weight_idle - weights.risk_weight_idle) < 0.01 &&
      Math.abs(w.risk_weight_don_deficit - weights.risk_weight_don_deficit) < 0.01 &&
      Math.abs(w.risk_weight_don_drop - weights.risk_weight_don_drop) < 0.01
    ) {
      return key;
    }
  }
  return 'balanced';
}

export default function RiskPrioritySelect({ weights, onSelect }) {
  const preset = getPreset(weights);
  return (
    <label className="block">
      <span className="text-sm">Risk Priority</span>
      <select
        className="mt-1 w-full border px-2 py-1 rounded"
        value={preset}
        onChange={(e) => onSelect(PRESETS[e.target.value].weights)}
      >
        {Object.entries(PRESETS).map(([key, p]) => (
          <option key={key} value={key}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}
