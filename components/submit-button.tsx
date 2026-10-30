'use client';

import { useFormStatus } from 'react-dom';
import { BusyLabel } from '@/components/loading';

/** Submit button that shows a spinner while its form is submitting or navigating. */
export function SubmitButton({ label, busyLabel, className }: { label: string; busyLabel?: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      <BusyLabel busy={pending} label={label} busyLabel={busyLabel} />
    </button>
  );
}
