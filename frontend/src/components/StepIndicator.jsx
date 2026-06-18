/**
 * StepIndicator.jsx
 * Shows the 4-step progress bar at the top of the workflow.
 */

const STEPS = [
  { id: 1, label: 'Job Description' },
  { id: 2, label: 'Upload CVs' },
  { id: 3, label: 'Processing' },
  { id: 4, label: 'Results' },
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="step-indicator">
      {STEPS.map((step, i) => {
        const isDone   = currentStep > step.id;
        const isActive = currentStep === step.id;
        const cls = isDone ? 'done' : isActive ? 'active' : '';

        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <div className={`step-item ${cls}`}>
              <div className="step-bubble">
                {isDone ? '✓' : step.id}
              </div>
              <span className="step-label">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`step-connector ${isDone ? 'done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
