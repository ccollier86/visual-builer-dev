import { useCallback, useMemo, useReducer, useRef } from 'react';
import type { FormSessionOptions } from '../session';
import { FormSession } from '../session';

export function useFormSession(options: FormSessionOptions) {
  const sessionRef = useRef<FormSession>();
  if (!sessionRef.current) {
    sessionRef.current = new FormSession(options);
  }
  const session = sessionRef.current;

  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const setFieldValue = useCallback(
    (fieldId: string, value: unknown) => {
      session.setValue(fieldId, value);
      forceUpdate();
    },
    [session]
  );

  const nextStep = useCallback(() => {
    session.nextStep();
    forceUpdate();
  }, [session]);

  const previousStep = useCallback(() => {
    session.previousStep();
    forceUpdate();
  }, [session]);

  const currentValues = useMemo(() => session.getValues(), [session, forceUpdate]);

  return {
    session,
    values: currentValues,
    setFieldValue,
    currentStepIndex: session.getCurrentStepIndex(),
    nextStep,
    previousStep,
    submit: () => session.submit(),
  };
}
